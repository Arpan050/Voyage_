import { Router } from "express";
import { body, query as q, type CustomValidator } from "express-validator";
import { authenticate, optionalAuth, requireAdmin } from "../middleware/auth.js";
import { uuidParam, validate } from "../middleware/validate.js";
import { BOOKING_STATUSES } from "../domain/booking.js";
import {
  cancelBooking, createBooking, getAllBookings, getBookingById, getMyBookings, updateBookingStatus,
} from "../controllers/bookingController.js";

const router = Router();
const isGuest: CustomValidator = (_value, { req }) => !(req as unknown as Express.Request).user;
const todayUtc = () => new Date().toISOString().slice(0, 10);

router.post("/", optionalAuth,
  body("package_id").isUUID().withMessage("A valid package is required"),
  body("travelers").isInt({ min: 1, max: 50 }).withMessage("Travellers must be between 1 and 50").toInt(),
  body("start_date").isDate({ format: "YYYY-MM-DD", strictMode: true }).withMessage("Start date must be YYYY-MM-DD")
    .custom((d: string) => d > todayUtc()).withMessage("Start date must be in the future"),
  body("special_notes").optional({ values: "falsy" }).isString().isLength({ max: 1000 }),
  body("guest_phone").optional({ values: "falsy" }).isString().isLength({ max: 30 }),
  // Guests have no account, so we need a way to reach them.
  body("guest_name").if(isGuest).trim().isLength({ min: 2, max: 120 }).withMessage("Your name is required"),
  body("guest_email").if(isGuest).trim().isEmail().withMessage("A valid email is required"),
  validate, createBooking);

router.get("/me", authenticate, getMyBookings);

router.get("/",  requireAdmin,
  q("status").optional().isIn([...BOOKING_STATUSES]).withMessage("Unknown status"),
  validate, getAllBookings);

router.get("/:id", authenticate, uuidParam(), getBookingById);

router.patch("/:id/status", requireAdmin, uuidParam(),
  body("status").isIn([...BOOKING_STATUSES]).withMessage(`Status must be one of: ${BOOKING_STATUSES.join(", ")}`),
  validate, updateBookingStatus);

router.delete("/:id", authenticate, uuidParam(), cancelBooking);

export default router;
