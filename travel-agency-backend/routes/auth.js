const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { body } = require("express-validator");
const { query }              = require("../db");
const { validate }           = require("../middleware/errorHandler");
const { authenticate }       = require("../middleware/auth");
const { sendWelcomeEmail }   = require("../controllers/emailService");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/register
router.post("/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
      .matches(/[0-9]/).withMessage("Password must contain a number"),
    body("phone").optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, phone } = req.body;

      // Check duplicate
      const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rows.length) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const { rows } = await query(
        `INSERT INTO users (name, email, password_hash, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, phone, created_at`,
        [name, email, passwordHash, phone || null]
      );

      const user  = rows[0];
      const token = signToken(user.id);

      // Fire and forget welcome email
      sendWelcomeEmail({ to: email, name }).catch(() => {});

      res.status(201).json({ token, user });
    } catch (err) { next(err); }
  }
);

// POST /api/auth/login
router.post("/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const { rows } = await query(
        "SELECT id, name, email, role, phone, avatar_url, password_hash FROM users WHERE email = $1",
        [email]
      );
      if (!rows.length) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.passwordHash || user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = signToken(user.id);
      const { password_hash, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (err) { next(err); }
  }
);

// GET /api/auth/me — get current user profile
router.get("/me", authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/me — update profile
router.patch("/me",
  authenticate,
  [
    body("name").optional().trim().notEmpty(),
    body("phone").optional().trim(),
  ],
  validate,
  async (req, res, next) => {
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
  }
);

// POST /api/auth/change-password
router.post("/change-password",
  authenticate,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
      const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!valid) return res.status(400).json({ error: "Current password is incorrect" });

      const newHash = await bcrypt.hash(newPassword, 12);
      await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, req.user.id]);
      res.json({ message: "Password updated successfully" });
    } catch (err) { next(err); }
  }
);

module.exports = router;
