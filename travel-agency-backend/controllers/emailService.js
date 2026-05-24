const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendBookingConfirmation({ to, name, refCode, packageName, startDate, travelers, total }) {
  if (!process.env.EMAIL_USER) return; // skip if email not configured

  await transporter.sendMail({
    from: `"Voyage Travel" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Booking Confirmed — ${refCode}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0e0e0e">
        <div style="background:#1a2332;padding:32px;text-align:center">
          <h1 style="font-family:Georgia,serif;color:#f5f0e8;font-size:2rem;margin:0">Voyage<span style="color:#c4622d">.</span></h1>
        </div>
        <div style="padding:40px 32px;background:#f5f0e8">
          <h2 style="font-family:Georgia,serif;font-size:1.6rem;margin:0 0 8px">Hi ${name},</h2>
          <p style="color:#6b7280;margin:0 0 32px">Your booking request has been received and is being reviewed.</p>
          <div style="background:#e8dcc8;border-radius:4px;padding:24px;margin-bottom:24px">
            <p style="font-family:monospace;font-size:.72rem;color:#c4622d;letter-spacing:.1em;margin:0 0 16px">BOOKING REFERENCE</p>
            <p style="font-family:monospace;font-size:1.4rem;font-weight:700;color:#0e0e0e;margin:0 0 20px">${refCode}</p>
            <table style="width:100%;font-size:.88rem">
              <tr><td style="color:#6b7280;padding:6px 0">Package</td><td style="text-align:right;font-weight:600">${packageName}</td></tr>
              <tr><td style="color:#6b7280;padding:6px 0">Start Date</td><td style="text-align:right">${startDate}</td></tr>
              <tr><td style="color:#6b7280;padding:6px 0">Travellers</td><td style="text-align:right">${travelers}</td></tr>
              <tr><td style="color:#6b7280;padding:6px 0">Total Estimate</td><td style="text-align:right;color:#c4622d;font-weight:600">$${total}</td></tr>
            </table>
          </div>
          <p style="color:#6b7280;font-size:.88rem;line-height:1.7">
            Our travel specialist will reach out within <strong>24 hours</strong> to confirm your itinerary and arrange payment. No amount is charged today.
          </p>
        </div>
        <div style="padding:24px 32px;text-align:center;background:#0e0e0e">
          <p style="font-family:monospace;font-size:.65rem;color:rgba(245,240,232,.25);margin:0">© 2025 Voyage Travel · Built by Arpan Paul</p>
        </div>
      </div>
    `,
  });
}

async function sendWelcomeEmail({ to, name }) {
  if (!process.env.EMAIL_USER) return;
  await transporter.sendMail({
    from: `"Voyage Travel" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to Voyage",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px;background:#f5f0e8"><h2 style="font-family:Georgia,serif">Welcome, ${name}!</h2><p style="color:#6b7280">Your Voyage account is ready. Start exploring our curated travel packages and let us craft your next story.</p></div>`,
  });
}

module.exports = { sendBookingConfirmation, sendWelcomeEmail };
