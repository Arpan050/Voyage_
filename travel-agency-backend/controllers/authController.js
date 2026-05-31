const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const { query } = require("../db");
const { sendWelcomeEmail } = require("./emailService");

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, phone, created_at`,
      [name, email, passwordHash, phone || null]
    );

    const user  = rows[0];
    const token = signToken(user.id);
    sendWelcomeEmail({ to: email, name }).catch(() => {});
    res.status(201).json({ token, user });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query(
      "SELECT id, name, email, role, phone, avatar_url, password_hash FROM users WHERE email = $1",
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: "Invalid email or password" });

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user.id);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) { next(err); }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

const updateMe = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const { rows } = await query(
      `UPDATE users SET
         name  = COALESCE($1, name),
         phone = COALESCE($2, phone)
       WHERE id = $3
       RETURNING id, name, email, role, phone, avatar_url`,
      [name || null, phone || null, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(newPassword, 12);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, req.user.id]);
    res.json({ message: "Password updated successfully" });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, updateMe, changePassword };
