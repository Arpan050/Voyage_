import type { RequestHandler } from "express";
import { logger } from "../utils/logger.js";

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    if (req.path === "/health") return;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info("request", {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      ms: Math.round(ms * 10) / 10,
      userId: req.user?.id,
    });
  });
  next();
};
