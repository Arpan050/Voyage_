import { env } from "../config/env.js";

type Level = "debug" | "info" | "warn" | "error";
const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = env.isTest ? Infinity : LEVELS[env.isProd ? "info" : "debug"];

function write(level: Level, msg: string, fields?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;
  const entry = { time: new Date().toISOString(), level, msg, ...fields };
  const line = env.isProd ? JSON.stringify(entry) : `${entry.time} ${level.toUpperCase().padEnd(5)} ${msg}${fields ? " " + JSON.stringify(fields) : ""}`;
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const logger = {
  debug: (msg: string, f?: Record<string, unknown>) => write("debug", msg, f),
  info:  (msg: string, f?: Record<string, unknown>) => write("info", msg, f),
  warn:  (msg: string, f?: Record<string, unknown>) => write("warn", msg, f),
  error: (msg: string, f?: Record<string, unknown>) => write("error", msg, f),
};
