import { Router } from "express";
import { body, query as q } from "express-validator";
import { optionalAuth, requireAdmin } from "../middleware/auth.js";
import { uuidParam, validate } from "../middleware/validate.js";
import { createPackage, deletePackage, getAllPackages, getPackageById, updatePackage } from "../controllers/packageController.js";

const router = Router();
const REGIONS = ["europe", "asia", "americas", "africa", "oceania"];

const fields = (required: boolean) => {
  const opt = <T extends { optional: (o?: object) => T }>(c: T) => (required ? c : c.optional());
  return [
    opt(body("name").trim().isLength({ min: 2, max: 200 })).withMessage("Name must be 2–200 characters"),
    opt(body("destination").trim().isLength({ min: 2, max: 200 })).withMessage("Destination is required"),
    opt(body("region").isIn(REGIONS)).withMessage(`Region must be one of: ${REGIONS.join(", ")}`),
    opt(body("price").isFloat({ min: 0, max: 1_000_000 })).withMessage("Price must be between 0 and 1,000,000").toFloat(),
    opt(body("duration_days").isInt({ min: 1, max: 365 })).withMessage("Duration must be 1–365 days").toInt(),
    body("group_min").optional().isInt({ min: 1, max: 500 }).withMessage("Group minimum must be at least 1").toInt(),
    body("group_max").optional().isInt({ min: 1, max: 500 }).withMessage("Group maximum must be at least 1").toInt()
      .custom((max, { req }) => req.body.group_min === undefined || max >= req.body.group_min)
      .withMessage("Group maximum can't be less than the minimum"),
    body("badge").optional({ values: "null" }).isString().isLength({ max: 50 }),
    body("description").optional({ values: "null" }).isString().isLength({ max: 5000 }),
    body("highlights").optional().isArray({ max: 20 }).withMessage("Highlights must be a list"),
    body("highlights.*").isString().trim().isLength({ min: 1, max: 120 }),
    body("emoji").optional({ values: "null" }).isString().isLength({ max: 10 }),
    body("bg_gradient").optional({ values: "null" }).isString().isLength({ max: 200 }),
    body("is_active").optional().isBoolean().toBoolean(),
  ];
};

router.get("/", optionalAuth,
  q("region").optional().isIn(REGIONS).withMessage("Unknown region"),
  q("sort").optional().isIn(["price_asc", "price_desc", "duration", "rating", "newest"]).withMessage("Unknown sort"),
  q("search").optional().isString().isLength({ max: 100 }),
  validate, getAllPackages);

router.get("/:id", uuidParam(), getPackageById);
router.post("/", requireAdmin, fields(true), validate, createPackage);
router.patch("/:id", requireAdmin, uuidParam(), fields(false), validate, updatePackage);
router.delete("/:id", requireAdmin, uuidParam(), deletePackage);

export default router;
