import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ── Gmail transporter ──────────────────────────────────────────────────────
// Uses Gmail App Password (not your real Gmail password)
// Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file
function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null; // fallback mode — OTP shown in console/response
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

// ── OTP Email Template ─────────────────────────────────────────────────────
function buildOtpEmail(otp: string, recipientEmail: string) {
  return {
    from: `"NASaAlaga - Calaca CVO" <${process.env.GMAIL_USER}>`,
    to: recipientEmail,
    subject: '🐾 NASaAlaga — Your Verification Code',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2B5EA6 0%,#60A85C 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🐾</div>
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">NASaAlaga</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">
              Calaca City Veterinary Management System
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="color:#1e293b;font-size:20px;margin:0 0 12px;">Email Verification</h2>
            <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px;">
              Use the code below to verify your email address and complete your registration.
              This code is valid for <strong>10 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <div style="background:#f0f7ff;border:2px solid #2B5EA6;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
              <p style="color:#64748b;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">
                Your Verification Code
              </p>
              <div style="font-size:48px;font-weight:700;color:#2B5EA6;letter-spacing:12px;font-family:'Courier New',monospace;">
                ${otp}
              </div>
            </div>

            <!-- Warning -->
            <div style="background:#fff7ed;border-left:4px solid #F39C3A;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;">
              <p style="color:#92400e;font-size:13px;margin:0;line-height:1.5;">
                ⚠️ <strong>Do not share this code</strong> with anyone.
                NASaAlaga staff will never ask for your OTP.
              </p>
            </div>

            <p style="color:#94a3b8;font-size:13px;margin:0;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
              City Veterinarian's Office · Calaca, Batangas 4212<br>
              Protected by the Data Privacy Act of 2012 (RA 10173)
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
    text: `
NASaAlaga - Calaca City Veterinary Management System

Your verification code is: ${otp}

This code expires in 10 minutes.

Do not share this code with anyone.
City Veterinarian's Office · Calaca, Batangas
    `.trim(),
  };
}

// ── Main send function ─────────────────────────────────────────────────────
export interface SendOtpResult {
  sent: boolean;
  fallbackMode: boolean;
  otp?: string; // only returned in fallback mode (no email configured)
  error?: string;
}

export async function sendOtpEmail(toEmail: string, otp: string): Promise<SendOtpResult> {
  const transporter = createTransporter();

  // No Gmail credentials configured → fallback mode
  if (!transporter) {
    console.warn('[Email] GMAIL_USER or GMAIL_APP_PASSWORD not set — running in fallback mode');
    console.log(`[Email] OTP for ${toEmail}: ${otp}`);
    return { sent: false, fallbackMode: true, otp };
  }

  try {
    await transporter.sendMail(buildOtpEmail(otp, toEmail));
    console.log(`[Email] ✅ OTP sent to ${toEmail}`);
    return { sent: true, fallbackMode: false };
  } catch (err: any) {
    console.error('[Email] ❌ Failed to send OTP:', err.message);
    // Still return OTP in fallback so dev can test — in prod, don't expose it
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      sent: false,
      fallbackMode: true,
      otp: isDev ? otp : undefined,
      error: err.message,
    };
  }
}

// ── Verify Gmail connection on startup ─────────────────────────────────────
export async function verifyEmailConnection(): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('[Email] ⚠️  Gmail not configured — OTP will be shown in console/response (dev mode)');
    console.warn('[Email]    Add GMAIL_USER and GMAIL_APP_PASSWORD to backend/.env to enable email');
    return;
  }
  try {
    await transporter.verify();
    console.log(`[Email] ✅ Gmail connected — sending from ${process.env.GMAIL_USER}`);
  } catch (err: any) {
    console.error('[Email] ❌ Gmail connection failed:', err.message);
    console.error('[Email]    Check GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env');
  }
}
