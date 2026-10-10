import { Router } from "express";
import { body, query as q } from "express-validator";
import { requireAdmin } from "../middleware/auth.js";
import { uuidParam, validate } from "../middleware/validate.js";
import { getDashboardStats, getRevenue, getUsers, updateUserRole } from "../controllers/adminController.js";

const router = Router();
router.use(requireAdmin);

router.get("/stats", getDashboardStats);
router.get("/revenue", getRevenue);
router.get("/users", q("role").optional().isIn(["user", "admin"]), validate, getUsers);
router.patch("/users/:id/role", uuidParam(),
  body("role").isIn(["user", "admin"]).withMessage("Role must be user or admin"),
  validate, updateUserRole);

export default router;
