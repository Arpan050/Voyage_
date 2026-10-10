import type { RequestHandler } from "express";
import { query } from "../db/index.js";
import { cacheDel, cacheDelPrefix } from "../db/cache.js";
import { AppError } from "../utils/AppError.js";

export const getPackageReviews: RequestHandler = async (req, res) => {
  const { rows } = await query(
    `SELECT r.id, r.rating, r.review_text, r.created_at, u.name AS author_name
     FROM reviews r LEFT JOIN users u ON u.id = r.user_id
     WHERE r.package_id = $1 ORDER BY r.created_at DESC`,
    [req.params.id],
  );
  res.json({ reviews: rows });
};

export const createReview: RequestHandler = async (req, res) => {
  const { package_id, rating, review_text } = req.body as { package_id: string; rating: number; review_text?: string };
  const userId = req.user!.id;

  // Only travellers whose trip is marked completed may review it.
  const done = await query<{ id: string }>(
    "SELECT id FROM bookings WHERE user_id = $1 AND package_id = $2 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
    [userId, package_id],
  );
  if (!done.rows[0]) throw AppError.forbidden("You can only review a package after your trip has been completed");

  const dup = await query("SELECT 1 FROM reviews WHERE user_id = $1 AND package_id = $2", [userId, package_id]);
  if (dup.rowCount) throw AppError.conflict("You've already reviewed this package");

  const { rows } = await query(
    "INSERT INTO reviews (user_id, package_id, booking_id, rating, review_text) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [userId, package_id, done.rows[0].id, rating, review_text?.trim() || null],
  );
  await Promise.all([cacheDel(`package:${package_id}`), cacheDelPrefix("packages:")]);
  res.status(201).json({ review: rows[0] });
};
