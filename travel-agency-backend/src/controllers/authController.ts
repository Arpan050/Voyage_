import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { query } from "../db/index.js";
import { AppError } from "../utils/AppError.js";
import { sendWelcomeEmail } from "./emailService.js";
import type { UserRole } from "../types/express.js";

interface UserRow {
  id: string; name: string; email: string; role: UserRole;
  phone: string | null; avatar_url: string | null; password_hash: string;
}

const BCRYPT_ROUNDS = 12;
const signToken = (userId: string): string =>
  jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });

const publicUser = ({ password_hash: _omit, ...rest }: UserRow) => rest;

export const register: RequestHandler = async (req, res) => {
  const { name, email, password, phone } = req.body as { name: string; email: string; password: string; phone?: string };

  const existing = await query("SELECT 1 FROM users WHERE email = $1", [email]);
  if (existing.rowCount) throw AppError.conflict("Email already registered");

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // Role is never read from the request body — every self-registered user is a customer.
  const { rows } = await query<UserRow>(
    `INSERT INTO users (name, email, password_hash, phone) VALUES ($1,$2,$3,$4)
     RETURNING id, name, email, role, phone, avatar_url, password_hash`,
    [name, email, hash, phone || null],
  );
  const user = rows[0]!;
  void sendWelcomeEmail(email, name);
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
};

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const { rows } = await query<UserRow>(
    "SELECT id, name, email, role, phone, avatar_url, password_hash FROM users WHERE email = $1",
    [email],
  );
  const user = rows[0];
  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) throw AppError.unauthorized("Invalid email or password");
  res.json({ token: signToken(user.id), user: publicUser(user) });
};

export const getMe: RequestHandler = (req, res) => {
  res.json({ user: req.user });
};

export const updateMe: RequestHandler = async (req, res) => {
  const { name, phone } = req.body as { name?: string; phone?: string };
  const { rows } = await query(
    `UPDATE users SET
       name  = COALESCE($1, name),
       phone = CASE WHEN $2::boolean THEN $3 ELSE phone END
     WHERE id = $4
     RETURNING id, name, email, role, phone, avatar_url`,
    [name ?? null, phone !== undefined, phone === "" ? null : (phone ?? null), req.user!.id],
  );
  res.json({ user: rows[0] });
};

export const changePassword: RequestHandler = async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const { rows } = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [req.user!.id]);
  const ok = await bcrypt.compare(currentPassword, rows[0]!.password_hash);
  if (!ok) throw AppError.badRequest("Current password is incorrect");

  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(newPassword, BCRYPT_ROUNDS), req.user!.id]);
  res.json({ message: "Password updated successfully" });
};
