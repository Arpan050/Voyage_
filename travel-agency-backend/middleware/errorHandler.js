const { validationResult } = require("express-validator");

// Run express-validator checks and return 422 if any fail
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
}

// Global error handler — attach as last middleware in app
function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err.message);

  if (err.code === "23505") { // PostgreSQL unique violation
    return res.status(409).json({ error: "A record with this value already exists." });
  }
  if (err.code === "23503") { // Foreign key violation
    return res.status(400).json({ error: "Referenced record does not exist." });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
}

module.exports = { validate, errorHandler };
