import { Router } from "express";
import { getPublicStats, getRecentReviews } from "../controllers/publicController.js";

const router = Router();
router.get("/stats", getPublicStats);
router.get("/reviews", getRecentReviews);
export default router;
