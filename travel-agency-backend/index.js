require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const authRoutes     = require("./routes/auth");
const packageRoutes  = require("./routes/packages");
const bookingRoutes  = require("./routes/bookings");
const adminRoutes    = require("./routes/admin");
const reviewRoutes   = require("./routes/reviews");
const { errorHandler } = require("./middleware/errorHandler");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger (dev)
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── Health check ─────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date() }));

// ── API Routes ────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/reviews",  reviewRoutes);

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global error handler ──────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 Voyage API running on http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(`   DB:  ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);
});

module.exports = app;
