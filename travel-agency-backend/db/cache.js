const { createClient } = require("redis");

let client = null;
let connected = false;

async function getRedis() {
  if (client && connected) return client;

  client = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });

  client.on("error", (err) => {
    connected = false;
    console.warn("Redis unavailable — caching disabled:", err.message);
  });
  client.on("ready", () => { connected = true; });

  try {
    await client.connect();
    connected = true;
  } catch {
    connected = false;
  }

  return client;
}

// Get cached JSON value
async function cacheGet(key) {
  try {
    const c = await getRedis();
    if (!connected) return null;
    const val = await c.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

// Set JSON value with TTL (seconds)
async function cacheSet(key, value, ttl = 300) {
  try {
    const c = await getRedis();
    if (!connected) return;
    await c.setEx(key, ttl, JSON.stringify(value));
  } catch { /* silent */ }
}

// Delete a cache key (or pattern with *)
async function cacheDel(key) {
  try {
    const c = await getRedis();
    if (!connected) return;
    await c.del(key);
  } catch { /* silent */ }
}

module.exports = { cacheGet, cacheSet, cacheDel };
