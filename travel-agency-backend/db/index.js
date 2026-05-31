const { Pool } = require("pg");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "7000"),
  database: process.env.DB_NAME     || "voyage_travel",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("connect", () => console.log("✅ DB connected"));
pool.on("error", (err) => console.error("❌ DB error:", err.message));
pool.query('SELECT 1')
  .then(() => console.log('✅ PostgreSQL connected successfully'))
  .catch(err => console.error('❌ PostgreSQL connection failed:', err.message));
const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };