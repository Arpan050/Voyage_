import "dotenv/config";

export interface Env {
  nodeEnv: "development" | "production" | "test";
  isProd: boolean;
  isTest: boolean;
  port: number;
  frontendUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  db: {
    connectionString?: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  redisUrl?: string;
  email: { host: string; port: number; user?: string; pass?: string };
  anthropic: { apiKey?: string; model: string };
}

const PLACEHOLDER_SECRETS = new Set([
  "your_super_secret_jwt_key_change_in_production",
  "your_jwt_secret_change_in_production",
  "changeme",
]);

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const raw = source.NODE_ENV;
  const nodeEnv = raw === "production" || raw === "test" ? raw : "development";
  const isProd = nodeEnv === "production";

  const jwtSecret = source.JWT_SECRET ?? "";
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required. Copy .env.example to .env and set it.");
  }
  if (isProd && (jwtSecret.length < 32 || PLACEHOLDER_SECRETS.has(jwtSecret))) {
    throw new Error("JWT_SECRET must be a random string of at least 32 characters in production.");
  }

  return {
    nodeEnv,
    isProd,
    isTest: nodeEnv === "test",
    port: int(source.PORT, 5000),
    frontendUrl: source.FRONTEND_URL ?? "http://localhost:5173",
    jwtSecret,
    jwtExpiresIn: source.JWT_EXPIRES_IN ?? "7d",
    db: {
      connectionString: source.DATABASE_URL,
      host: source.DB_HOST ?? "localhost",
      port: int(source.DB_PORT, 5432),
      name: source.DB_NAME ?? "voyage_travel",
      user: source.DB_USER ?? "postgres",
      password: source.DB_PASSWORD ?? "",
      ssl: source.DB_SSL === "true",
    },
    redisUrl: source.REDIS_URL || undefined,
    email: {
      host: source.EMAIL_HOST ?? "smtp.gmail.com",
      port: int(source.EMAIL_PORT, 587),
      user: source.EMAIL_USER?.trim() || undefined,
      pass: source.EMAIL_PASS?.trim() || undefined,
    },
    anthropic: {
      apiKey: source.ANTHROPIC_API_KEY?.trim() || undefined,
      model: source.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    },
  };
}

export const env: Env = loadEnv();
