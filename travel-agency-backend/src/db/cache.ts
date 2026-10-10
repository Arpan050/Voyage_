import { createClient } from "redis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

type Client = ReturnType<typeof createClient>;

let client: Client | null = null;
let connected = false;

/** Caching is optional: with no REDIS_URL, or if Redis is down, every call is a no-op. */
export async function connectCache(): Promise<void> {
  if (!env.redisUrl || client || env.isTest) return;

  const c = createClient({
    url: env.redisUrl,
    socket: { connectTimeout: 3000, reconnectStrategy: (n) => (n > 3 ? false : n * 500) },
  });
  c.on("ready", () => { connected = true; logger.info("Redis connected"); });
  c.on("end",   () => { connected = false; });
  c.on("error", (err: Error) => { connected = false; logger.warn("Redis unavailable", { error: err.message }); });
  client = c;

  try {
    await c.connect();
  } catch {
    logger.warn("Redis not reachable — caching disabled");
  }
}

export const isCacheUp = (): boolean => connected;

function withTimeout<T>(p: Promise<T>, ms = 1000): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("cache timeout")), ms))]);
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!client || !connected) return null;
  try {
    const raw = await withTimeout(client.get(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!client || !connected) return;
  try { await withTimeout(client.setEx(key, ttlSeconds, JSON.stringify(value))); } catch { /* best effort */ }
}

/** Delete every key starting with `prefix` (e.g. "packages:"). */
export async function cacheDelPrefix(prefix: string): Promise<void> {
  if (!client || !connected) return;
  try {
    let cursor = "0";
    do {
      const res = await withTimeout(client.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 }), 2000);
      cursor = String(res.cursor);
      if (res.keys.length) await client.del(res.keys);
    } while (cursor !== "0");
  } catch { /* best effort */ }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!client || !connected || !keys.length) return;
  try { await withTimeout(client.del(keys)); } catch { /* best effort */ }
}
