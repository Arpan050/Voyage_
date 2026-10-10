import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { uuidParam } from "../middleware/validate.js";
import { createReview, getPackageReviews } from "../controllers/reviewController.js";

const router = Router();

router.get("/package/:id", uuidParam(), getPackageReviews);

router.post("/", authenticate,
  body("package_id").isUUID().withMessage("A valid package is required"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1–5").toInt(),
  body("review_text").optional({ values: "falsy" }).isString().isLength({ max: 2000 }),
  validate, createReview);

export default router;
