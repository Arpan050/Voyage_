import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { checkDb } from "./db/index.js";
import { isCacheUp } from "./db/cache.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { apiLimiter } from "./middleware/security.js";
import authRoutes from "./routes/auth.js";
import packageRoutes from "./routes/packages.js";
import bookingRoutes from "./routes/bookings.js";
import reviewRoutes from "./routes/reviews.js";
import adminRoutes from "./routes/admin.js";
import publicRoutes from "./routes/public.js";
import conciergeRoutes from "./routes/concierge.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.isProd) app.set("trust proxy", 1); // behind Nginx / a load balancer

  app.use(helmet());
  app.use(cors({
    origin: env.frontendUrl.split(",").map((s) => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  }));
  app.use(express.json({ limit: "100kb" }));
  if (!env.isTest) app.use(requestLogger);

  app.get("/health", async (_req, res) => {
    const db = await checkDb();
    res.status(db ? 200 : 503).json({
      status: db ? "ok" : "degraded",
      db: db ? "up" : "down",
      cache: env.redisUrl ? (isCacheUp() ? "up" : "down") : "disabled",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api", apiLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/packages", packageRoutes);
  app.use("/api/bookings", bookingRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/concierge", conciergeRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
