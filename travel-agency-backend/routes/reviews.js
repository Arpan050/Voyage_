const express  = require("express");
const { body } = require("express-validator");
const db       = require("../db");
const { authenticate }  = require("../middleware/auth");
const { validate }      = require("../middleware/errorHandler");
const { cacheDel }      = require("../db/cache");

const router = express.Router();

// POST /api/reviews — logged-in user submits a review
router.post("/",
  authenticate,
  [
    body("package_id").notEmpty(),
    body("rating").isInt({ min: 1, max: 5 }),
    body("review_text").optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { package_id, booking_id, rating, review_text } = req.body;

      // Check package exists
      const pkgRes = await db.query("SELECT id FROM packages WHERE id = $1", [package_id]);
      if (!pkgRes.rows.length) return res.status(404).json({ error: "Package not found" });

      // One review per user per package
      const existing = await db.query(
        "SELECT id FROM reviews WHERE user_id = $1 AND package_id = $2",
        [req.user.id, package_id]
      );
      if (existing.rows.length) return res.status(409).json({ error: "You have already reviewed this package" });

      const { rows } = await db.query(
        `INSERT INTO reviews (user_id, package_id, booking_id, rating, review_text)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.user.id, package_id, booking_id || null, rating, review_text || null]
      );

      await cacheDel(`package:${package_id}`);
      res.status(201).json({ review: rows[0] });
    } catch (err) { next(err); }
  }
);

// GET /api/reviews/package/:id
router.get("/package/:id", async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.rating, r.review_text, r.created_at, u.name AS author_name
       FROM reviews r LEFT JOIN users u ON u.id = r.user_id
       WHERE r.package_id = $1 ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json({ reviews: rows });
  } catch (err) { next(err); }
});

module.exports = router;
