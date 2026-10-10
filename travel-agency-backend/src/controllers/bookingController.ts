import { randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { query } from "../db/index.js";
import { AppError } from "../utils/AppError.js";
import { parsePagination } from "../utils/pagination.js";
import { canTransition, isBookingStatus, type Actor, type BookingStatus } from "../domain/booking.js";
import { sendBookingConfirmation, sendBookingStatusEmail } from "./emailService.js";
import type { BookingRow, PackageRow } from "../types/models.js";

// No 0/O/1/I so codes are easy to read out over the phone.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateRefCode(): string {
  const bytes = randomBytes(8);
  return "VYG-" + Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export const createBooking: RequestHandler = async (req, res) => {
  const b = req.body as {
    package_id: string; travelers: number; start_date: string; special_notes?: string;
    guest_name?: string; guest_email?: string; guest_phone?: string;
  };

  const pkgRes = await query<PackageRow>("SELECT * FROM packages WHERE id = $1 AND is_active = TRUE", [b.package_id]);
  const pkg = pkgRes.rows[0];
  if (!pkg) throw AppError.notFound("Package not found or no longer available");
  if (b.travelers > pkg.group_max) throw AppError.badRequest(`This package accepts at most ${pkg.group_max} travellers`);

  // Integer cents — avoids floating-point drift.
  const totalCents = Math.round(Number(pkg.price) * 100) * b.travelers;
  const total = (totalCents / 100).toFixed(2);

  let booking: BookingRow | undefined;
  for (let attempt = 0; attempt < 5 && !booking; attempt++) {
    try {
      const { rows } = await query<BookingRow>(
        `INSERT INTO bookings (ref_code, user_id, package_id, guest_name, guest_email, guest_phone, travelers, start_date, total_price, special_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [generateRefCode(), req.user?.id ?? null, pkg.id,
         req.user ? null : b.guest_name, req.user ? null : b.guest_email, b.guest_phone || req.user?.phone || null,
         b.travelers, b.start_date, total, b.special_notes || null],
      );
      booking = rows[0];
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "23505") throw err; // only retry ref_code collisions
    }
  }
  if (!booking) throw new AppError(503, "Could not generate a booking reference. Please try again.");

  const toEmail = req.user?.email ?? b.guest_email;
  const toName = req.user?.name ?? b.guest_name ?? "Traveller";
  if (toEmail) {
    void sendBookingConfirmation({
      to: toEmail, name: toName, refCode: booking.ref_code, packageName: pkg.name,
      startDate: b.start_date, travelers: b.travelers, total,
    });
  }
  res.status(201).json({ booking, refCode: booking.ref_code });
};

export const getMyBookings: RequestHandler = async (req, res) => {
  const { rows } = await query(
    `SELECT b.*, p.name AS package_name, p.destination, p.emoji, p.duration_days,
            EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = b.user_id AND r.package_id = b.package_id) AS reviewed
     FROM bookings b JOIN packages p ON p.id = b.package_id
     WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
    [req.user!.id],
  );
  res.json({ bookings: rows });
};

export const getAllBookings: RequestHandler = async (req, res) => {
  const { status } = req.query as { status?: string };
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const params: unknown[] = [];
  let where = "";
  if (status) { params.push(status); where = "WHERE b.status = $1"; }

  const [{ rows }, count] = await Promise.all([
    query(
      `SELECT b.*, COALESCE(u.name, b.guest_name) AS customer_name, COALESCE(u.email, b.guest_email) AS customer_email,
              p.name AS package_name, p.destination, p.emoji
       FROM bookings b JOIN packages p ON p.id = b.package_id LEFT JOIN users u ON u.id = b.user_id
       ${where} ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM bookings b ${where}`, params),
  ]);
  const total = count.rows[0]!.total;
  res.json({ bookings: rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
};

export const getBookingById: RequestHandler = async (req, res) => {
  const { rows } = await query(
    `SELECT b.*, p.name AS package_name, p.destination, p.emoji FROM bookings b
     JOIN packages p ON p.id = b.package_id WHERE b.id = $1`,
    [req.params.id],
  );
  const booking = rows[0] as (BookingRow & Record<string, unknown>) | undefined;
  // Same response for "missing" and "not yours" so IDs can't be probed.
  if (!booking || (req.user!.role !== "admin" && booking.user_id !== req.user!.id)) throw AppError.notFound("Booking not found");
  res.json({ booking });
};

async function transition(id: string, to: BookingStatus, actor: Actor, ownerId?: string): Promise<BookingRow> {
  const { rows } = await query<BookingRow>("SELECT * FROM bookings WHERE id = $1", [id]);
  const current = rows[0];
  if (!current || (actor === "customer" && current.user_id !== ownerId)) throw AppError.notFound("Booking not found");

  if (!canTransition(current.status, to, actor)) {
    throw AppError.conflict(`A ${current.status} booking cannot be changed to ${to}`);
  }
  // Guarded update: if someone changed the status in between, nothing matches.
  const updated = await query<BookingRow>(
    "UPDATE bookings SET status = $1 WHERE id = $2 AND status = $3 RETURNING *",
    [to, id, current.status],
  );
  if (!updated.rows[0]) throw AppError.conflict("This booking was just updated by someone else. Refresh and try again.");
  return updated.rows[0];
}

export const updateBookingStatus: RequestHandler = async (req, res) => {
  const { status } = req.body as { status: string };
  if (!isBookingStatus(status)) throw AppError.badRequest("Invalid status");
  const booking = await transition(req.params.id as string, status, "admin");

  const contact = await query<{ email: string | null; name: string | null }>(
    `SELECT COALESCE(u.email, b.guest_email) AS email, COALESCE(u.name, b.guest_name) AS name
     FROM bookings b LEFT JOIN users u ON u.id = b.user_id WHERE b.id = $1`,
    [booking.id],
  );
  const c = contact.rows[0];
  if (c?.email) void sendBookingStatusEmail(c.email, c.name ?? "Traveller", booking.ref_code, status);
  res.json({ booking });
};

export const cancelBooking: RequestHandler = async (req, res) => {
  const booking = await transition(req.params.id as string, "cancelled", "customer", req.user!.id);
  res.json({ message: "Booking cancelled", booking });
};
