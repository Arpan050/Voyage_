const express  = require("express");
const { body } = require("express-validator");
const db       = require("../db");
const { authenticate, optionalAuth, requireAdmin } = require("../middleware/auth");
const { validate }          = require("../middleware/errorHandler");
const { sendBookingConfirmation } = require("../controllers/emailService");

const router = express.Router();

// Generate ref code: TRP-XXXXXX
function genRef() {
  return "TRP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/bookings — create booking (logged-in or guest)
router.post("/",
  optionalAuth,
  [
    body("package_id").notEmpty().withMessage("Package ID required"),
    body("travelers").isInt({ min: 1, max: 20 }),
    body("start_date").isDate().withMessage("Valid start date required"),
    body("guest_name").if((v, { req }) => !req.user).notEmpty().withMessage("Name required for guest booking"),
    body("guest_email").if((v, { req }) => !req.user).isEmail().withMessage("Valid email required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { package_id, travelers, start_date, guest_name, guest_email, guest_phone, special_notes } = req.body;

      // Fetch package price
      const pkgRes = await db.query("SELECT id, name, price FROM packages WHERE id = $1 AND is_active = TRUE", [package_id]);
      if (!pkgRes.rows.length) return res.status(404).json({ error: "Package not found" });

      const pkg        = pkgRes.rows[0];
      const totalPrice = (pkg.price * parseInt(travelers)).toFixed(2);
      const refCode    = genRef();

      const name  = req.user?.name  || guest_name;
      const email = req.user?.email || guest_email;

      const { rows } = await db.query(
        `INSERT INTO bookings
           (ref_code, user_id, package_id, guest_name, guest_email, guest_phone,
            travelers, start_date, total_price, special_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          refCode,
          req.user?.id || null,
          package_id,
          req.user ? null : guest_name,
          req.user ? null : guest_email,
          guest_phone || null,
          travelers,
          start_date,
          totalPrice,
          special_notes || null,
        ]
      );

      const booking = rows[0];

      // Fire and forget confirmation email
      sendBookingConfirmation({
        to:          email,
        name,
        refCode,
        packageName: pkg.name,
        startDate:   start_date,
        travelers,
        total:       totalPrice,
      }).catch(() => {});

      res.status(201).json({ booking, refCode, totalPrice });
    } catch (err) { next(err); }
  }
);

// GET /api/bookings/me — logged-in user's own bookings
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, p.name AS package_name, p.destination, p.emoji, p.duration_days
       FROM bookings b
       JOIN packages p ON p.id = b.package_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: rows });
  } catch (err) { next(err); }
});

// GET /api/bookings — admin: all bookings with filters
router.get("/", ...requireAdmin, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = "";

    if (status) {
      params.push(status);
      where = `WHERE b.status = $${params.length}`;
    }

    params.push(parseInt(limit), offset);
    const { rows } = await db.query(
      `SELECT b.*,
              COALESCE(u.name,  b.guest_name)  AS customer_name,
              COALESCE(u.email, b.guest_email) AS customer_email,
              p.name AS package_name, p.destination, p.emoji
       FROM bookings b
       LEFT JOIN users    u ON u.id = b.user_id
       LEFT JOIN packages p ON p.id = b.package_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = status ? [status] : [];
    const countWhere  = status ? "WHERE status = $1" : "";
    const countRes    = await db.query(`SELECT COUNT(*) FROM bookings ${countWhere}`, countParams);

    res.json({ bookings: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/bookings/:id — get single booking
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, p.name AS package_name, p.destination, p.emoji, p.highlights
       FROM bookings b
       JOIN packages p ON p.id = b.package_id
       WHERE b.id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });
    const booking = rows[0];
    // Users can only see their own bookings; admins can see all
    if (req.user.role !== "admin" && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ booking });
  } catch (err) { next(err); }
});

// PATCH /api/bookings/:id/status — admin only
router.patch("/:id/status",
  ...requireAdmin,
  [body("status").isIn(["pending","confirmed","cancelled","completed"])],
  validate,
  async (req, res, next) => {
    try {
      const { rows } = await db.query(
        "UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *",
        [req.body.status, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Booking not found" });
      res.json({ booking: rows[0] });
    } catch (err) { next(err); }
  }
);

// DELETE /api/bookings/:id — user can cancel their own pending booking
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query("SELECT * FROM bookings WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });
    const booking = rows[0];

    if (req.user.role !== "admin" && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ error: "Only pending bookings can be cancelled" });
    }

    await db.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [req.params.id]);
    res.json({ message: "Booking cancelled" });
  } catch (err) { next(err); }
});

module.exports = router;
