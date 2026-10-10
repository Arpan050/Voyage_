import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const common = { max: 20, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 };

export const pool = new Pool(
  env.db.connectionString
    ? {
        connectionString: env.db.connectionString,
        // Managed Postgres (Render, RDS, Neon…) usually requires TLS.
        ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
        ...common,
      }
    : {
        host: env.db.host,
        port: env.db.port,
        database: env.db.name,
        user: env.db.user,
        password: env.db.password,
        ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
        ...common,
      },
);

pool.on("error", (err) => logger.error("Idle Postgres client error", { error: err.message }));

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function checkDb(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
