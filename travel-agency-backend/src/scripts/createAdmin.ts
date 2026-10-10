/**
 * Create (or promote) an admin account without ever putting a password in the repo.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-Passw0rd' npm run create-admin
 *   docker compose exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... api node dist/scripts/createAdmin.js
 *
 * If the email already exists, that user is promoted to admin and their password is replaced.
 */
import bcrypt from "bcryptjs";
import { pool, query } from "../db/index.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Administrator";

function fail(msg: string): never {
  console.error(`create-admin: ${msg}`);
  process.exit(1);
}

if (!email || !/^\S+@\S+\.\S+$/.test(email)) fail("set ADMIN_EMAIL to a valid email address");
if (!password) fail("set ADMIN_PASSWORD");
if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
  fail("ADMIN_PASSWORD must be at least 12 characters with upper-case, lower-case and a number");
}
if (password.length > 72) fail("ADMIN_PASSWORD must be at most 72 characters (bcrypt limit)");

const hash = await bcrypt.hash(password, 12);
const { rows } = await query<{ id: string; created: boolean }>(
  `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')
   ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash
   RETURNING id, (xmax = 0) AS created`,
  [name, email, hash],
);
console.log(`create-admin: ${rows[0]!.created ? "created" : "promoted existing user to"} admin ${email}`);
await pool.end();
