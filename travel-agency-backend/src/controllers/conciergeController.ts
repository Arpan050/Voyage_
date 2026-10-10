import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { query } from "../db/index.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

interface ChatMessage { role: "user" | "assistant"; content: string }

/** Proxies the chat to Anthropic so the API key stays on the server. */
export const chat: RequestHandler = async (req, res) => {
  if (!env.anthropic.apiKey) throw new AppError(503, "The AI concierge isn't configured on this server.");

  let messages = (req.body as { messages: ChatMessage[] }).messages;
  while (messages[0]?.role === "assistant") messages = messages.slice(1); // API requires a user turn first
  if (!messages.length) throw AppError.badRequest("No user message to answer");

  const { rows } = await query<{ name: string; destination: string; duration_days: number; price: string }>(
    "SELECT name, destination, duration_days, price FROM packages WHERE is_active = TRUE ORDER BY name",
  );
  const catalogue = rows.map((p) => `${p.name} (${p.destination}, ${p.duration_days} days, $${p.price}/person)`).join("; ");
  const system =
    "You are Voyage, a friendly travel concierge for a demo travel agency. Help visitors choose between the packages below " +
    "and answer general destination questions (best seasons, packing, etiquette). Be warm and concise — under 120 words. " +
    "Only recommend packages from this list; if nothing fits, say so. Don't invent availability, prices or visa rules — " +
    "suggest checking official sources for visas. " +
    `Packages: ${catalogue || "none currently listed"}.`;

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.anthropic.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.anthropic.model, max_tokens: 400, system, messages }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    logger.warn("Concierge upstream unreachable", { error: err instanceof Error ? err.message : String(err) });
    throw new AppError(502, "The concierge is unavailable right now. Please try again shortly.");
  }
  if (!upstream.ok) {
    logger.warn("Concierge upstream error", { status: upstream.status });
    throw new AppError(502, "The concierge is unavailable right now. Please try again shortly.");
  }

  const data = (await upstream.json()) as { content?: { type: string; text?: string }[] };
  const reply = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
  res.json({ reply: reply || "Sorry, I couldn't come up with an answer. Could you rephrase that?" });
};
