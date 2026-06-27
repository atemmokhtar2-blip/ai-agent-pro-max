/**
 * Request Validation Middleware
 *
 * Validates request body/query/params against a Zod schema.
 * Returns 400 with structured errors on failure.
 */

import type { Request, Response, NextFunction } from "express";

interface SafeParseSchema {
  safeParse(data: unknown): { success: boolean; error?: { format(): unknown }; data?: unknown };
}

export function validateBody(schema: SafeParseSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error?.format(),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: SafeParseSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: "Query validation failed",
        details: result.error?.format(),
      });
      return;
    }
    (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  };
}
