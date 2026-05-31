const db           = require("../db");
const { cacheDel } = require("../db/cache");

const createReview = async (req, res, next) => {
  try {
    const { package_id, booking_id, rating, review_text } = req.body;

    const pkgRes = await db.query("SELECT id FROM packages WHERE id = $1", [package_id]);
    if (!pkgRes.rows.length) return res.status(404).json({ error: "Package not found" });

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
};

const getPackageReviews = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.rating, r.review_text, r.created_at, u.name AS author_name
       FROM reviews r LEFT JOIN users u ON u.id = r.user_id
       WHERE r.package_id = $1 ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json({ reviews: rows });
  } catch (err) { next(err); }
};

module.exports = { createReview, getPackageReviews };
