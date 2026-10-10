import { Router } from "express";
import { body } from "express-validator";
import { conciergeLimiter } from "../middleware/security.js";
import { validate } from "../middleware/validate.js";
import { chat } from "../controllers/conciergeController.js";

const router = Router();

router.post("/", conciergeLimiter,
  body("messages").isArray({ min: 1, max: 20 }).withMessage("messages must be a list of 1–20 items"),
  body("messages.*.role").isIn(["user", "assistant"]).withMessage("Invalid role"),
  body("messages.*.content").isString().trim().isLength({ min: 1, max: 2000 }).withMessage("Each message must be 1–2000 characters"),
  body("messages").custom((m: { role: string }[]) => m[m.length - 1]?.role === "user").withMessage("The last message must be from the user"),
  validate, chat);

export default router;
