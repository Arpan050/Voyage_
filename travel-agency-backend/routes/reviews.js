const express  = require("express");
const { body } = require("express-validator");
const { createReview, getPackageReviews } = require("../controllers/reviewController");
const { authenticate } = require("../middleware/auth");
const { validate }     = require("../middleware/errorHandler");

const router = express.Router();

router.post("/",
  authenticate,
  [
    body("package_id").notEmpty(),
    body("rating").isInt({ min: 1, max: 5 }),
    body("review_text").optional().trim().isLength({ max: 1000 }),
  ],
  validate,
  createReview
);

router.get("/package/:id", getPackageReviews);

module.exports = router;
