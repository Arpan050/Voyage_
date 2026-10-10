import type { RequestHandler } from "express";
import { query } from "../db/index.js";
import { AppError } from "../utils/AppError.js";
import { parsePagination } from "../utils/pagination.js";

export const getDashboardStats: RequestHandler = async (_req, res) => {
  const [revenue, byStatus, customers, rating] = await Promise.all([
    // Only bookings an admin has accepted count as revenue.
    query<{ total: number }>("SELECT COALESCE(SUM(total_price),0)::float AS total FROM bookings WHERE status IN ('confirmed','completed')"),
    query<{ status: string; total: number }>("SELECT status, COUNT(*)::int AS total FROM bookings GROUP BY status"),
    query<{ total: number }>("SELECT COUNT(*)::int AS total FROM users WHERE role = 'user'"),
    query<{ avg: number; count: number }>("SELECT COALESCE(ROUND(AVG(rating),1),0)::float AS avg, COUNT(*)::int AS count FROM reviews"),
  ]);

  const bookingsByStatus: Record<string, number> = {};
  for (const r of byStatus.rows) bookingsByStatus[r.status] = r.total;

  res.json({
    totalRevenue: revenue.rows[0]!.total,
    totalBookings: Object.values(bookingsByStatus).reduce((a, b) => a + b, 0),
    activeBookings: (bookingsByStatus.confirmed ?? 0) + (bookingsByStatus.pending ?? 0),
    bookingsByStatus,
    totalCustomers: customers.rows[0]!.total,
    avgRating: rating.rows[0]!.avg,
    reviewCount: rating.rows[0]!.count,
  });
};

/** Monthly revenue for the last 12 months (confirmed + completed bookings only). */
export const getRevenue: RequestHandler = async (_req, res) => {
  const { rows } = await query(
    `SELECT DATE_TRUNC('month', created_at) AS month,
            COALESCE(SUM(total_price),0)::float AS revenue,
            COUNT(*)::int AS bookings
     FROM bookings
     WHERE status IN ('confirmed','completed') AND created_at >= NOW() - INTERVAL '12 months'
     GROUP BY month ORDER BY month ASC`,
  );
  res.json({ revenue: rows });
};

export const getUsers: RequestHandler = async (req, res) => {
  const { role } = req.query as { role?: string };
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = role ? "WHERE role = $1" : "";
  const params = role ? [role] : [];

  const [{ rows }, count] = await Promise.all([
    query(
      `SELECT id, name, email, role, phone, created_at FROM users ${where}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM users ${where}`, params),
  ]);
  const total = count.rows[0]!.total;
  res.json({ users: rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
};

export const updateUserRole: RequestHandler = async (req, res) => {
  const id = req.params.id as string;
  const { role } = req.body as { role: "user" | "admin" };
  if (id === req.user!.id) throw AppError.badRequest("You can't change your own role");

  const { rows } = await query("UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role", [role, id]);
  if (!rows[0]) throw AppError.notFound("User not found");
  res.json({ user: rows[0] });
};
