import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { escapeHtml as e } from "../utils/escapeHtml.js";

const enabled = Boolean(env.email.user && env.email.pass);

const transporter = enabled
  ? nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.port === 465,
      auth: { user: env.email.user, pass: env.email.pass },
    })
  : null;

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) return; // email not configured — skip silently
  try {
    await transporter.sendMail({ from: `"Voyage Travel (demo)" <${env.email.user}>`, to, subject, html });
  } catch (err) {
    logger.warn("Email failed to send", { to, error: err instanceof Error ? err.message : String(err) });
  }
}

export interface BookingEmail {
  to: string; name: string; refCode: string; packageName: string;
  startDate: string; travelers: number; total: string;
}

export function sendBookingConfirmation(b: BookingEmail): Promise<void> {
  const html = `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0e0e0e">
    <div style="background:#1a2332;padding:32px;text-align:center">
      <h1 style="font-family:Georgia,serif;color:#f5f0e8;font-size:2rem;margin:0">Voyage<span style="color:#c4622d">.</span></h1>
    </div>
    <div style="padding:40px 32px;background:#f5f0e8">
      <h2 style="font-family:Georgia,serif;font-size:1.6rem;margin:0 0 8px">Hi ${e(b.name)},</h2>
      <p style="color:#6b7280;margin:0 0 32px">Your booking request has been received and is awaiting review.</p>
      <div style="background:#e8dcc8;border-radius:4px;padding:24px;margin-bottom:24px">
        <p style="font-family:monospace;font-size:.72rem;color:#c4622d;letter-spacing:.1em;margin:0 0 16px">BOOKING REFERENCE</p>
        <p style="font-family:monospace;font-size:1.4rem;font-weight:700;margin:0 0 20px">${e(b.refCode)}</p>
        <table style="width:100%;font-size:.88rem">
          <tr><td style="color:#6b7280;padding:6px 0">Package</td><td style="text-align:right;font-weight:600">${e(b.packageName)}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Start date</td><td style="text-align:right">${e(b.startDate)}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Travellers</td><td style="text-align:right">${b.travelers}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Total estimate</td><td style="text-align:right;color:#c4622d;font-weight:600">$${e(b.total)}</td></tr>
        </table>
      </div>
      <p style="color:#6b7280;font-size:.88rem;line-height:1.7">This is a portfolio demo project — no real booking or payment has been made.</p>
    </div>
  </div>`;
  return send(b.to, `Booking request received — ${b.refCode}`, html);
}

export function sendWelcomeEmail(to: string, name: string): Promise<void> {
  return send(to, "Welcome to Voyage", `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px;background:#f5f0e8"><h2 style="font-family:Georgia,serif">Welcome, ${e(name)}!</h2><p style="color:#6b7280">Your Voyage demo account is ready.</p></div>`);
}

export function sendBookingStatusEmail(to: string, name: string, refCode: string, status: string): Promise<void> {
  return send(to, `Booking ${refCode} is now ${status}`, `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px;background:#f5f0e8"><h2 style="font-family:Georgia,serif">Hi ${e(name)},</h2><p style="color:#6b7280">Your booking <strong>${e(refCode)}</strong> is now <strong>${e(status)}</strong>.</p></div>`);
}
