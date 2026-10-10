import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: { NODE_ENV: "test", JWT_SECRET: "test_secret_test_secret_test_secret_123456" },
  },
});
