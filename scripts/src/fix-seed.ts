/**
 * Fix seeded user passwords — generates proper bcrypt hashes
 * and upserts the three seed users into the database.
 */

import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";

const SEED_PASSWORD = "password123";
const SALT_ROUNDS = 12;

async function main() {
  const hash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  console.log("Generated hash:", hash);

  const now = new Date();

  const users = [
    {
      id: "seed-user-admin-001",
      username: "superadmin",
      email: "admin@aiagent.dev",
      passwordHash: hash,
      role: "super_admin" as const,
      emailVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-alice-002",
      username: "alice",
      email: "alice@example.com",
      passwordHash: hash,
      role: "admin" as const,
      emailVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-user-bob-003",
      username: "bob",
      email: "bob@example.com",
      passwordHash: hash,
      role: "user" as const,
      emailVerified: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const user of users) {
    await db
      .insert(usersTable)
      .values(user)
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          passwordHash: user.passwordHash,
          updatedAt: now,
        },
      });
    console.log(`Upserted user: ${user.email}`);
  }

  console.log("\nDone. Login with: admin@aiagent.dev / password123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
