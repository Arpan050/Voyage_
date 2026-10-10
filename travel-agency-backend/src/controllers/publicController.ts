import type { RequestHandler } from "express";
import { query } from "../db/index.js";

/** Real numbers from the database — the home page shows these instead of hardcoded claims. */
export const getPublicStats: RequestHandler = async (_req, res) => {
  const { rows } = await query(`SELECT
      (SELECT COUNT(*)::int FROM packages WHERE is_active)               AS packages,
      (SELECT COUNT(DISTINCT destination)::int FROM packages WHERE is_active) AS destinations,
      (SELECT COUNT(*)::int FROM reviews)                                AS reviews,
      (SELECT ROUND(AVG(rating),1)::float FROM reviews)                  AS avg_rating`);
  res.json(rows[0]);
};

export const getRecentReviews: RequestHandler = async (_req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.rating, r.review_text, r.created_at, u.name AS author_name, p.name AS package_name
     FROM reviews r JOIN packages p ON p.id = r.package_id LEFT JOIN users u ON u.id = r.user_id
     WHERE r.review_text IS NOT NULL AND r.review_text <> '' ORDER BY r.created_at DESC LIMIT 3`,
  );
  res.json({ reviews: rows });
};
