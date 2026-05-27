import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { signToken } from '../middleware/auth';
import { sendOtpEmail } from '../services/email';

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

    if (!user) {
      query(`INSERT INTO audit_logs (username, action, resource, details, ip_address) VALUES ($1,'Login Failed','Authentication',$2,$3)`,
        [email, JSON.stringify({ reason: 'User not found' }), req.ip]).catch(() => {});
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      query(`INSERT INTO audit_logs (user_id, username, action, resource, details, ip_address) VALUES ($1,$2,'Login Failed','Authentication',$3,$4)`,
        [user.id, user.username, JSON.stringify({ reason: 'Invalid password' }), req.ip]).catch(() => {});
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ── Maintenance Mode check: block non-superadmins ──────────────────────
    if (user.role !== 'superadmin') {
      try {
        const maintResult = await query("SELECT value FROM system_settings WHERE key = 'maintenance_mode'");
        if (maintResult.rows[0]?.value === 'true') {
          return res.status(503).json({ error: 'maintenance', message: 'System is currently under maintenance. Please try again later.' });
        }
      } catch (_maintErr) {
        // system_settings table not yet migrated — skip check, allow login
      }
    }

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
      email: user.email,
      barangay: user.barangay || null,
      address: user.address || null,
      phone: user.phone || null,
    };

    // Log successful login
    query(
      `INSERT INTO audit_logs (user_id, username, action, resource, details, ip_address) VALUES ($1,$2,'Login','Authentication',$3,$4)`,
      [user.id, user.username, JSON.stringify({ role: user.role, email: user.email }), req.ip]
    ).catch(() => {});

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
      email: user.email,
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
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // OTP email remapping for superadmin accounts:
    // nexgov email → personal email (where the OTP is actually sent)
    const OTP_EMAIL_REMAP: Record<string, string> = {
      'deleonlance@nexgov.ph': 'deleonlancewinalexandrei@gmail.com',
      'parkarel@nexgov.ph': '__karelannepar@gmail.com',
    };
    const deliveryEmail = OTP_EMAIL_REMAP[normalizedEmail] || normalizedEmail;
    const otpKey = normalizedEmail; // OTP stored under the original email key

    // Block superadmin emails from signing up (but allow OTP for clear-records flow)
    const existingUser = await query('SELECT role FROM users WHERE email = $1', [normalizedEmail]);
    if (existingUser.rows[0]?.role === 'superadmin') {
      // Still allow OTP send (for clear-records verification) - don't block
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await query(
      `INSERT INTO otp_store (key, otp, expires_at, method, verified)
       VALUES ($1, $2, $3, 'email', false)
       ON CONFLICT (key) DO UPDATE
         SET otp = $2, expires_at = $3, verified = false, created_at = NOW()`,
      [otpKey, otp, expiresAt]
    );

    // Send via Gmail (to deliveryEmail, not the nexgov email)
    const result = await sendOtpEmail(deliveryEmail, otp);

    return res.json({
      success: true,
      message: result.sent
        ? `Verification code sent to ${deliveryEmail}. Check your inbox.`
        : '⚠️ Email not configured — use the code shown below (development mode only).',
      fallbackMode: result.fallbackMode,
      otp: result.fallbackMode ? result.otp : undefined, // only expose in dev fallback
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error('[send-otp]', err);
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
    const { email, phone, password, username, barangay, address, temporaryId, calacazenId, householdNumber, role } = req.body;
    const key = email ? email.toLowerCase() : phone;

    const otpResult = await query('SELECT * FROM otp_store WHERE key=$1 AND verified=true', [key]);
    if (!otpResult.rows[0]) return res.status(400).json({ error: 'Please verify OTP first' });

    const existing = await query('SELECT id FROM users WHERE email=$1', [key]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    // Validate and assign role — only public-facing roles allowed through signup
    const allowedSignupRoles = ['petOwner', 'livestockManager', 'both', 'owner'];
    const assignedRole = role && allowedSignupRoles.includes(role) ? role : 'petOwner';

    const countResult = await query('SELECT COUNT(*) FROM users');
    const count = parseInt(countResult.rows[0].count);
    const userId = `USER-${String(count + 1).padStart(3, '0')}`;
    const ownerId = temporaryId || `OWNER-${uuidv4().slice(0, 8).toUpperCase()}`;
    const hash = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users (id, email, phone, password_hash, username, role, owner_id, barangay, address, verified, calacazen_id, household_number, temp_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11,$12)`,
      [userId, key, phone || null, hash, username, assignedRole, ownerId, barangay || null, address || null,
       calacazenId || null, householdNumber || null, temporaryId || null]
    );

    // If a temporaryId was supplied, link all pets that carry that temp_id to this new user
    if (temporaryId && temporaryId.trim()) {
      await query(
        `UPDATE pets SET owner_id=$1 WHERE temp_id=$2 AND (owner_id IS NULL OR owner_id='')`,
        [ownerId, temporaryId.trim()]
      );
      // Invalidate the temp_id so it can't be reused
      await query(`UPDATE pets SET temp_id=NULL WHERE temp_id=$1`, [temporaryId.trim()]);
    }

    await query('DELETE FROM otp_store WHERE key=$1', [key]);

    const payload = { id: userId, username, role: assignedRole, ownerId, barangay: barangay || null };
    return res.json({ success: true, user: payload, token: signToken(payload) });
  } catch (err: any) {
    console.error('[Signup]', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
