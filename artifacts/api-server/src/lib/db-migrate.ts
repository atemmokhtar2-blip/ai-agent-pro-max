/**
 * Database Auto-Migration
 *
 * Runs on every server startup BEFORE accepting any requests.
 * Uses drizzle-orm's migrate() to apply pending SQL migrations from
 * lib/db/migrations/ — zero downtime, no data loss, fully automatic.
 *
 * Idempotency strategy for push-bootstrapped databases:
 *   When `drizzle-kit push` was used to create tables (before migrations were
 *   introduced), the `drizzle.__drizzle_migrations` tracking table is empty.
 *   migrate() then tries to re-run all migrations and fails on "already exists".
 *
 *   Fix: if core tables exist but drizzle.__drizzle_migrations has no rows,
 *   pre-seed one row per migration using the correct SHA-256 hash + folderMillis.
 *   migrate() then skips every seeded migration (created_at >= folderMillis)
 *   while still applying any future new migrations normally.
 */

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool, usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Drizzle pg-core dialect defaults
const DRIZZLE_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

function getMigrationsFolder(): string {
  // esbuild bundles to dist/index.mjs; from dist/ go up 3 levels to repo root
  return path.resolve(__dirname, "../../../lib/db/migrations");
}

/**
 * Pre-seed drizzle.__drizzle_migrations when schema was bootstrapped via
 * drizzle-kit push (tables exist, tracking table is empty).
 *
 * Safe on all DB states:
 *   - Fresh DB (no tables)          → no-op; migrate() creates everything
 *   - Push-bootstrapped (no rows)   → seeds rows so migrate() skips them
 *   - Normal migrated (rows exist)  → no-op; migrate() runs as usual
 */
async function seedMigrationTrackingIfNeeded(migrationsFolder: string): Promise<void> {
  // 1. Are core tables already present?
  const tableCheck = await db.execute(sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
    LIMIT 1
  `);
  const tablesExist = ((tableCheck as unknown as { rows: unknown[] }).rows?.length ?? 0) > 0;
  if (!tablesExist) return; // Fresh DB — migrate() will handle it

  // 2. Ensure the drizzle schema and tracking table exist
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(DRIZZLE_SCHEMA)}`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(DRIZZLE_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} (
      id         SERIAL PRIMARY KEY,
      hash       text NOT NULL,
      created_at bigint
    )
  `);

  // 3. Is the tracking table already populated?
  const countResult = await db.execute(sql`
    SELECT COUNT(*) AS cnt
    FROM ${sql.identifier(DRIZZLE_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}
  `);
  const count = Number((countResult as unknown as { rows: Array<{ cnt: string }> }).rows?.[0]?.cnt ?? 0);
  if (count > 0) return; // Already tracked — migrate() will diff normally

  // 4. Seed: insert one row per migration file using SHA-256(sql content) + folderMillis
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) return;

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string; when: number }>;
  };

  for (const entry of journal.entries) {
    const sqlFile = path.join(migrationsFolder, `${entry.tag}.sql`);
    if (!fs.existsSync(sqlFile)) continue;

    const sqlContent = fs.readFileSync(sqlFile, "utf8");
    const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");

    await db.execute(sql`
      INSERT INTO ${sql.identifier(DRIZZLE_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}
        (hash, created_at)
      VALUES (${hash}, ${entry.when})
    `);
  }

  console.log("[db] ✓ Migration tracking pre-seeded (drizzle-kit push detected)");
}

export async function runMigrations(): Promise<void> {
  const start = Date.now();

  // ── 1. Connectivity check ────────────────────────────────────────────────
  console.log("[db] Checking database connection…");
  try {
    await db.execute(sql`SELECT 1`);
    console.log("[db] ✓ Database connection established");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[db] FATAL: Cannot connect to database: ${msg}`);
  }

  // ── 2. Seed tracking table for push-bootstrapped DBs (idempotent) ────────
  const migrationsFolder = getMigrationsFolder();
  console.log(`[db] Running migrations from: ${migrationsFolder}`);
  await seedMigrationTrackingIfNeeded(migrationsFolder);

  // ── 3. Apply migrations (skips already-seeded ones, runs new ones) ───────
  try {
    await migrate(db, { migrationsFolder });
    const elapsed = Date.now() - start;
    console.log(`[db] ✓ Migrations complete (${elapsed}ms)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ENOENT") || msg.includes("no such file")) {
      console.warn("[db] ⚠ Migrations folder not found — run `pnpm --filter @workspace/db run generate`");
    } else {
      throw new Error(`[db] Migration failed: ${msg}`);
    }
  }
}

// ── Permanent admin seed ──────────────────────────────────────────────────────
// Runs after every migration to guarantee the owner account always has
// super_admin role.  Uses UPSERT so it never touches other users' data.
const PERMANENT_ADMIN_EMAIL = "atemmokhtar2@gmail.com";

export async function ensureAdminUser(): Promise<void> {
  try {
    // Check if user already exists
    const existing = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.email, PERMANENT_ADMIN_EMAIL))
      .limit(1);

    if (existing.length > 0) {
      // User exists — only update role if not already super_admin
      if (existing[0]!.role !== "super_admin") {
        await db
          .update(usersTable)
          .set({ role: "super_admin", updatedAt: new Date() })
          .where(eq(usersTable.email, PERMANENT_ADMIN_EMAIL));
        console.log(`[db] ✓ Admin role granted to ${PERMANENT_ADMIN_EMAIL}`);
      } else {
        console.log(`[db] ✓ Admin user already configured (${PERMANENT_ADMIN_EMAIL})`);
      }
    } else {
      // User doesn't exist yet — create with no password (can register/OAuth later)
      await db.insert(usersTable).values({
        id: "permanent-admin-atemmokhtar2",
        username: "atemmokhtar2",
        email: PERMANENT_ADMIN_EMAIL,
        passwordHash: null,
        role: "super_admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`[db] ✓ Admin user created: ${PERMANENT_ADMIN_EMAIL}`);
    }
  } catch (err) {
    // Non-fatal — log but don't crash the server
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[db] ⚠ Could not ensure admin user: ${msg}`);
  }
}

/** Graceful pool shutdown — call on SIGTERM/SIGINT */
export async function closeDb(): Promise<void> {
  await pool.end();
}
