import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { authLimiter } from "../middleware/security.js";
import { validate } from "../middleware/validate.js";
import { changePassword, getMe, login, register, updateMe } from "../controllers/authController.js";

const router = Router();

const strongPassword = (field: string) =>
  body(field)
    .isLength({ min: 8, max: 72 }).withMessage("Password must be 8–72 characters")
    .matches(/[A-Z]/).withMessage("Password needs an uppercase letter")
    .matches(/[0-9]/).withMessage("Password needs a number");

router.post("/register", authLimiter,
  body("name").trim().isLength({ min: 2, max: 120 }).withMessage("Name must be 2–120 characters"),
  body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
  strongPassword("password"),
  body("phone").optional({ values: "falsy" }).trim().isLength({ max: 30 }).withMessage("Phone is too long"),
  validate, register);

router.post("/login", authLimiter,
  body("email").trim().isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Password required"),
  validate, login);

router.get("/me", authenticate, getMe);

router.patch("/me", authenticate,
  body("name").optional().trim().isLength({ min: 2, max: 120 }).withMessage("Name must be 2–120 characters"),
  body("phone").optional().trim().isLength({ max: 30 }).withMessage("Phone is too long"),
  validate, updateMe);

router.post("/change-password", authenticate,
  body("currentPassword").isString().notEmpty().withMessage("Current password required"),
  strongPassword("newPassword"),
  validate, changePassword);

export default router;
