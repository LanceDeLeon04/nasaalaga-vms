import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { signToken } from '../middleware/auth';

const router = Router();

// ── Login ──────────────────────────────────────────────────────────────────
// For regular users  → returns { user, token } immediately
// For superadmins    → returns { requiresBarcodeVerification: true, pendingToken }
//                      Frontend then POSTs /auth/verify-barcode with the barcode
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // ── SuperAdmin path: password OK → require barcode scan ────────────────
    if (user.role === 'superadmin') {
      // Issue a short-lived pending token (5 minutes) — not a full session
      const pendingToken = signToken(
        { id: user.id, username: user.username, role: user.role, pendingBarcode: true },
        '5m'
      );
      return res.json({
        requiresBarcodeVerification: true,
        pendingToken,
        email: user.email,
        username: user.username,
      });
    }

    // ── Regular user path: done ────────────────────────────────────────────
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      ownerId: user.owner_id,
    };

    return res.json({ user: payload, token: signToken(payload) });
  } catch (err: any) {
    console.error('[Login]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Verify Barcode (SuperAdmin 2nd factor) ─────────────────────────────────
router.post('/verify-barcode', async (req: Request, res: Response) => {
  try {
    const { pendingToken, barcode } = req.body;
    if (!pendingToken || !barcode) {
      return res.status(400).json({ error: 'Pending token and barcode are required' });
    }

    // Decode the pending token
    let decoded: any;
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'nasaalaga-secret-key-change-in-production';
      decoded = jwt.verify(pendingToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Pending token expired or invalid. Please log in again.' });
    }

    if (!decoded.pendingBarcode) {
      return res.status(401).json({ error: 'Invalid verification flow' });
    }

    // Fetch user with barcode hash
    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND role = $2',
      [decoded.id, 'superadmin']
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'SuperAdmin not found' });

    // Compare barcode against stored hash
    const barcodeValid = await bcrypt.compare(barcode.trim(), user.barcode_hash);
    if (!barcodeValid) {
      return res.status(401).json({ error: 'Invalid ID barcode' });
    }

    // All good — issue full session token
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    return res.json({
      success: true,
      user: payload,
      token: signToken(payload),
    });
  } catch (err: any) {
    console.error('[VerifyBarcode]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Send OTP ───────────────────────────────────────────────────────────────
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) return res.status(400).json({ error: 'Email or phone required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const key = email ? email.toLowerCase() : phone;

    await query(
      `INSERT INTO otp_store (key, otp, expires_at, method, verified)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (key) DO UPDATE SET otp=$2, expires_at=$3, verified=false, created_at=NOW()`,
      [key, otp, expiresAt, email ? 'email' : 'phone']
    );

    const BREVO_KEY = process.env.BREVO_API_KEY;
    let otpSent = false;

    if (BREVO_KEY && email) {
      try {
        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'accept': 'application/json', 'api-key': BREVO_KEY, 'content-type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'NASaAlaga - Calaca CVO', email: 'noreply@nasaalaga.com' },
            to: [{ email, name: email.split('@')[0] }],
            subject: 'NASaAlaga – Email Verification Code',
            htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#2B5EA6,#60A85C);padding:30px;border-radius:10px 10px 0 0;text-align:center"><h1 style="color:white;margin:0">NASaAlaga</h1></div><div style="background:white;padding:40px;border-radius:0 0 10px 10px"><h2 style="color:#2B5EA6">Verify Your Email</h2><div style="background:#f0f7ff;border-left:4px solid #2B5EA6;padding:20px;margin:30px 0;text-align:center"><p style="margin:0;font-size:42px;font-weight:bold;color:#2B5EA6;letter-spacing:8px;font-family:monospace">${otp}</p></div><p style="color:#666;font-size:14px">This code expires in <strong>10 minutes</strong>.</p></div></div>`
          })
        });
        otpSent = resp.ok;
      } catch { otpSent = false; }
    }

    return res.json({
      success: true,
      message: otpSent ? `OTP sent to ${email}` : '⚠️ Email service unavailable. Use code below for testing.',
      fallbackMode: !otpSent,
      otp: !otpSent ? otp : undefined,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Verify OTP ─────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, phone, otp } = req.body;
    const key = email ? email.toLowerCase() : phone;

    const result = await query('SELECT * FROM otp_store WHERE key = $1', [key]);
    const stored = result.rows[0];
    if (!stored) return res.status(400).json({ error: 'OTP not found or expired' });

    if (new Date() > new Date(stored.expires_at)) {
      await query('DELETE FROM otp_store WHERE key = $1', [key]);
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (stored.otp !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    await query(`UPDATE otp_store SET verified=true, verified_at=NOW() WHERE key=$1`, [key]);
    return res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Signup ─────────────────────────────────────────────────────────────────
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, phone, password, username, barangay, address, temporaryId } = req.body;
    const key = email ? email.toLowerCase() : phone;

    const otpResult = await query('SELECT * FROM otp_store WHERE key=$1 AND verified=true', [key]);
    if (!otpResult.rows[0]) return res.status(400).json({ error: 'Please verify OTP first' });

    const existing = await query('SELECT id FROM users WHERE email=$1', [key]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const countResult = await query('SELECT COUNT(*) FROM users');
    const count = parseInt(countResult.rows[0].count);
    const userId = `USER-${String(count + 1).padStart(3, '0')}`;
    const ownerId = temporaryId || `OWNER-${uuidv4().slice(0, 8).toUpperCase()}`;
    const hash = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users (id, email, phone, password_hash, username, role, owner_id, barangay, address, verified)
       VALUES ($1,$2,$3,$4,$5,'owner',$6,$7,$8,true)`,
      [userId, key, phone || null, hash, username, ownerId, barangay || null, address || null]
    );

    await query('DELETE FROM otp_store WHERE key=$1', [key]);

    const payload = { id: userId, username, role: 'owner', ownerId };
    return res.json({ success: true, user: payload, token: signToken(payload) });
  } catch (err: any) {
    console.error('[Signup]', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
