const jwt = require("jsonwebtoken");
const { query } = require("../db");

// Verify JWT and attach user to req
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch fresh user from DB (catches revoked/deleted users)
    const { rows } = await query(
      "SELECT id, name, email, role, phone, avatar_url FROM users WHERE id = $1",
      [decoded.userId]
    );
    if (!rows.length) return res.status(401).json({ error: "User not found" });
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ error: "Token expired" });
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Optional auth — attaches user if token present, continues either way
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [decoded.userId]
    );
    if (rows.length) req.user = rows[0];
  } catch { /* ignore */ }
  next();
}

// RBAC: require specific role(s)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// Shorthand guards
const requireAdmin = [authenticate, requireRole("admin")];
const requireUser  = [authenticate];

module.exports = { authenticate, optionalAuth, requireRole, requireAdmin, requireUser };
