/**
 * Audit Logging Middleware / Helper
 *
 * Records important platform actions to the audit_logs table.
 * Used as a helper function from route handlers, not a raw middleware,
 * so it can capture request-specific context and avoid async errors.
 */

import type { Request } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { generateId } from "../lib/auth";
import { eventBus, PlatformEvents } from "../lib/events";
import { logger } from "./logger-helper";

export async function recordAuditLog(
  action: string,
  options?: {
    userId?: string;
    metadata?: Record<string, unknown>;
    req?: Request;
  }
): Promise<void> {
  try {
    const id = generateId();
    await db.insert(auditLogsTable).values({
      id,
      userId: options?.userId ?? options?.req?.user?.sub ?? null,
      action,
      metadata: options?.metadata ?? null,
    });

    eventBus.dispatch(PlatformEvents.ANALYTICS_EVENT, {
      type: "audit",
      action,
      userId: options?.userId,
    });
  } catch (err) {
    logger.error({ err, action }, "Failed to write audit log");
  }
}
