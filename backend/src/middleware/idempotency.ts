import { Response, NextFunction } from 'express';
import { query } from '../db';
import { AuthRequest } from './auth';

/**
 * Idempotency-Key support for the offline-sync queue.
 *
 * The app tags every deferrable write with `Idempotency-Key: <uuid>` — on the first attempt AND on every replay
 * from the offline queue. If a request succeeded but its response never reached the phone (dead zone, timeout),
 * the replay returns the stored response instead of creating a second pet / vaccination / report.
 *
 *  • Only successful (2xx) responses are remembered; errors release the key so a corrected retry can run.
 *  • Keys are scoped per user, so one account can never replay another's response.
 *  • Requests without the header are untouched.
 */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const STALE_PENDING_SECONDS = 120;

export const idempotency = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const raw = req.header('Idempotency-Key');
  if (!raw || raw.length > 100 || !MUTATING.has(req.method)) return next();

  const key = `${req.user?.id || 'anon'}:${raw}`;
  try {
    const claimed = await query(
      `INSERT INTO idempotency_keys (key, method, path, state)
       VALUES ($1, $2, $3, 'pending') ON CONFLICT (key) DO NOTHING RETURNING key`,
      [key, req.method, req.originalUrl.split('?')[0]]
    );

    if (claimed.rows.length === 0) {
      const existing = (await query(`SELECT state, status_code, response_body FROM idempotency_keys WHERE key=$1`, [key])).rows[0];
      if (existing?.state === 'done') {
        res.setHeader('Idempotent-Replay', 'true');
        return res.status(existing.status_code).json(existing.response_body);
      }
      // Another attempt with this key is still running — or crashed. Take over only if it's clearly stale.
      const takeover = await query(
        `UPDATE idempotency_keys SET created_at = NOW()
         WHERE key=$1 AND state='pending' AND created_at < NOW() - INTERVAL '${STALE_PENDING_SECONDS} seconds' RETURNING key`,
        [key]
      );
      if (takeover.rows.length === 0 && existing) {
        res.setHeader('Retry-After', '3');
        return res.status(503).json({ error: 'A request with this key is still being processed. Retrying shortly.', inProgress: true });
      }
    }
  } catch (err) {
    // Never block a write because the bookkeeping table is unavailable.
    console.error('[idempotency] bookkeeping failed, continuing without it:', err);
    return next();
  }

  let settled = false;
  const origJson = res.json.bind(res);
  res.json = ((body: any) => {
    settled = true;
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    const bookkeeping = ok
      ? query(`UPDATE idempotency_keys SET state='done', status_code=$2, response_body=$3 WHERE key=$1`, [key, res.statusCode, JSON.stringify(body)])
      : query(`DELETE FROM idempotency_keys WHERE key=$1`, [key]);
    // Persist BEFORE answering, so a fast replay can never observe a half-finished key.
    bookkeeping.catch(() => {}).finally(() => origJson(body));
    return res;
  }) as typeof res.json;

  // Handler ended without res.json (or the client hung up): release the key.
  res.on('close', () => {
    if (!settled) query(`DELETE FROM idempotency_keys WHERE key=$1 AND state='pending'`, [key]).catch(() => {});
  });

  if (Math.random() < 0.01) {
    query(`DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '30 days'`).catch(() => {});
  }
  next();
};
