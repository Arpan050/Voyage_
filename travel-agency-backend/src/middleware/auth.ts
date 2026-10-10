import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { query } from "../db/index.js";
import { AppError } from "../utils/AppError.js";
import type { AuthUser, UserRole } from "../types/express.js";

interface TokenPayload { userId: string }

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

async function loadUser(token: string): Promise<AuthUser | null> {
  const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
  // Read fresh from the DB so deleted users and role changes take effect immediately.
  const { rows } = await query<AuthUser>(
    "SELECT id, name, email, role, phone, avatar_url FROM users WHERE id = $1",
    [decoded.userId],
  );
  return rows[0] ?? null;
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) throw AppError.unauthorized("No token provided");
  try {
    const user = await loadUser(token);
    if (!user) throw AppError.unauthorized("User not found");
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof jwt.TokenExpiredError) throw AppError.unauthorized("Token expired");
    if (err instanceof jwt.JsonWebTokenError) throw AppError.unauthorized("Invalid token");
    throw err; // DB errors etc. → 500
  }
};

/** Attaches req.user when a valid token is sent; otherwise continues as a guest. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req);
  if (token) {
    try {
      const user = await loadUser(token);
      if (user) req.user = user;
    } catch { /* treat bad tokens as guest */ }
  }
  next();
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}

export const requireAdmin: RequestHandler[] = [authenticate, requireRole("admin")];
