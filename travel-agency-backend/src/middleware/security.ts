import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const make = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { error: message },
  });

/** Brute-force protection for login/register. */
export const authLimiter = make(15 * 60_000, 20, "Too many attempts. Please try again in a few minutes.");
/** Stops the chatbot endpoint being used as a free LLM proxy. */
export const conciergeLimiter = make(60_000, 10, "You're sending messages too quickly. Please wait a moment.");
/** Generic ceiling for the rest of the API. */
export const apiLimiter = make(60_000, 300, "Too many requests. Please slow down.");
