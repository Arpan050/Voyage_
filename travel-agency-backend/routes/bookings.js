const express  = require("express");
const { body } = require("express-validator");
const { createBooking, getMyBookings, getAllBookings, getBookingById, updateBookingStatus, cancelBooking } = require("../controllers/bookingController");
const { authenticate, optionalAuth, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/errorHandler");

const router = express.Router();

router.post("/",
  optionalAuth,
  [
    body("package_id").notEmpty().withMessage("Package ID required"),
    body("travelers").isInt({ min: 1, max: 20 }),
    body("start_date").isDate().withMessage("Valid start date required"),
  ],
  validate,
  createBooking
);

router.get("/me",  authenticate,    getMyBookings);
router.get("/",    ...requireAdmin, getAllBookings);
router.get("/:id", authenticate,    getBookingById);

router.patch("/:id/status",
  ...requireAdmin,
  [body("status").isIn(["pending","confirmed","cancelled","completed"])],
  validate,
  updateBookingStatus
);

router.delete("/:id", authenticate, cancelBooking);

module.exports = router;
