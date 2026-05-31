const db = require("../db");

const getStats = async (req, res, next) => {
  try {
    const [revenue, bookings, customers, rating] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(total_price),0)::NUMERIC(12,2) AS total FROM bookings WHERE status != 'cancelled'`),
      db.query(`SELECT COUNT(*) AS total, status FROM bookings GROUP BY status`),
      db.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'user'`),
      db.query(`SELECT COALESCE(AVG(rating),0)::NUMERIC(3,1) AS avg, COUNT(*) AS count FROM reviews`),
    ]);

    const bookingByStatus = {};
    bookings.rows.forEach((r) => { bookingByStatus[r.status] = parseInt(r.total); });

    res.json({
      totalRevenue:     parseFloat(revenue.rows[0].total),
      totalBookings:    Object.values(bookingByStatus).reduce((a, b) => a + b, 0),
      activeBookings:   (bookingByStatus.confirmed || 0) + (bookingByStatus.pending || 0),
      bookingsByStatus: bookingByStatus,
      totalCustomers:   parseInt(customers.rows[0].total),
      avgRating:        parseFloat(rating.rows[0].avg),
      reviewCount:      parseInt(rating.rows[0].count),
    });
  } catch (err) { next(err); }
};

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [parseInt(limit), offset];
    let where = "";
    if (role) { params.unshift(role); where = "WHERE role = $1"; }

    const { rows } = await db.query(
      `SELECT id, name, email, role, phone, created_at FROM users ${where}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ users: rows });
  } catch (err) { next(err); }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    const { rows } = await db.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

const getRevenue = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT DATE_TRUNC('month', created_at) AS month,
              SUM(total_price)::NUMERIC(12,2) AS revenue,
              COUNT(*) AS bookings
       FROM bookings
       WHERE status != 'cancelled' AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month ASC`
    );
    res.json({ revenue: rows });
  } catch (err) { next(err); }
};

module.exports = { getStats, getUsers, updateUserRole, getRevenue };
