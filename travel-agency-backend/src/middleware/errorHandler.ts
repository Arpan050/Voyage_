import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Route not found" });
};

interface PgError extends Error { code?: string }

const UNAVAILABLE_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "57P01", "57P02", "57P03"]);

/** True when the database (or network to it) is unreachable, as opposed to a bug in a query. */
function isDependencyDown(err: PgError): boolean {
  if (err.code && (UNAVAILABLE_CODES.has(err.code) || err.code.startsWith("08"))) return true;
  return /timeout exceeded when trying to connect|Connection terminated|connect ECONNREFUSED/i.test(err.message ?? "");
}

/** Maps known failures to controlled responses; unknown errors never leak details. */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }

  const pg = err as PgError;
  switch (pg?.code) {
    case "23505": res.status(409).json({ error: "A record with this value already exists." }); return;
    case "23503": res.status(400).json({ error: "Referenced record does not exist." }); return;
    case "22P02": res.status(400).json({ error: "Malformed identifier or value." }); return;
    case "23514": res.status(400).json({ error: "A value violates a database constraint." }); return;
  }

  if (pg instanceof Error && isDependencyDown(pg)) {
    logger.error("Dependency unavailable", { method: req.method, path: req.path, error: pg.message });
    res.setHeader("Retry-After", "5");
    res.status(503).json({ error: "Service temporarily unavailable. Please try again shortly." });
    return;
  }

  // express.json() parse failures and payload limits carry a 4xx status.
  const status = (err as { status?: number })?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: status === 413 ? "Payload too large" : "Bad request" });
    return;
  }

  logger.error("Unhandled error", {
    method: req.method,
    path: req.path,
    error: pg instanceof Error ? pg.message : String(err),
    stack: pg instanceof Error ? pg.stack : undefined,
  });
  res.status(500).json({ error: "Internal server error" });
};
