import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env.js";

describe("loadEnv", () => {
  it("requires JWT_SECRET", () => {
    expect(() => loadEnv({} as NodeJS.ProcessEnv)).toThrow(/JWT_SECRET/);
  });

  it("rejects short or placeholder secrets in production", () => {
    expect(() => loadEnv({ NODE_ENV: "production", JWT_SECRET: "short" } as NodeJS.ProcessEnv)).toThrow(/32 characters/);
    expect(() => loadEnv({ NODE_ENV: "production", JWT_SECRET: "your_super_secret_jwt_key_change_in_production" } as NodeJS.ProcessEnv)).toThrow();
  });

  it("applies safe defaults", () => {
    const e = loadEnv({ JWT_SECRET: "x" } as NodeJS.ProcessEnv);
    expect(e.port).toBe(5000);
    expect(e.db.port).toBe(5432);
    expect(e.redisUrl).toBeUndefined();
    expect(e.email.user).toBeUndefined();
  });
});
