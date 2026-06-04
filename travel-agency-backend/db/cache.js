const { createClient } = require("redis");

let client    = null;
let connected = false;

async function connect() {
  if (client && connected) return;

  client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        if (retries > 3) return false; // stop retrying after 3 attempts
        return retries * 500;
      }
    }
  });

  client.on("connect",   () => { connected = true;  console.log("✅ Redis connected"); });
  client.on("end",       () => { connected = false; console.log("⚠️  Redis disconnected"); });
  client.on("error",     (err) => {
    connected = false;
    console.warn("⚠️  Redis unavailable:", err.message);
  });

  try {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connection timeout")), 3000))
    ]);
  } catch (err) {
    connected = false;
    console.warn("⚠️  Redis not available — caching disabled");
  }
}

// Initialize connection on startup
connect();

async function cacheGet(key) {
  try {
    if (!connected) return null;
    const val = await Promise.race([
      client.get(key),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000))
    ]);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function cacheSet(key, value, ttl = 300) {
  try {
    if (!connected) return;
    await Promise.race([
      client.setEx(key, ttl, JSON.stringify(value)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000))
    ]);
  } catch { /* silent */ }
}

async function cacheDel(key) {
  try {
    if (!connected) return;
    await Promise.race([
      client.del(key),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000))
    ]);
  } catch { /* silent */ }
}

async function cacheFlush() {
  try {
    if (!connected) return;
    await client.flushAll();
    console.log("🗑️  Cache cleared");
  } catch { /* silent */ }
}

module.exports = { cacheGet, cacheSet, cacheDel, cacheFlush };