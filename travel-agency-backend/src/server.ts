import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { checkDb, pool } from "./db/index.js";
import { connectCache } from "./db/cache.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  if (!(await checkDb())) {
    logger.error("Cannot reach PostgreSQL — check DATABASE_URL / DB_* settings");
    process.exit(1);
  }
  await connectCache();

  const server = createApp().listen(env.port, () => {
    logger.info("Voyage API listening", { port: env.port, env: env.nodeEnv });
  });

  const shutdown = (signal: string) => {
    logger.info("Shutting down", { signal });
    server.close(async () => { await pool.end(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

void main();
