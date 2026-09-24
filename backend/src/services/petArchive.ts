/**
 * Pet registration renewal & auto-archive.
 *
 * A registration is valid for PET_RENEWAL_MONTHS (default 12) from registration_date, or from the
 * expiry set by the latest renewal. Once the expiry date has passed without a renewal the pet is
 * ARCHIVED (soft-hidden, never deleted). Staff can restore + renew an archived pet at any time.
 *
 *   expiry = COALESCE(registration_expires_at, registration_date + 12 months)
 */
import pool, { query } from '../db';
import { createBackup, isBusy } from './backup';

export const PET_RENEWAL_MONTHS = Math.max(1, parseInt(process.env.PET_RENEWAL_MONTHS || '12') || 12);
export const EXPIRING_SOON_DAYS = 30;

const TICK_MS = 60 * 60 * 1000;      // hourly check (cheap query)
const FIRST_TICK_MS = 60 * 1000;
const ADVISORY_LOCK_KEY = 7382012;

/** SQL expression for a pet's renewal due date. `a` is the table alias prefix, e.g. 'p.' */
export const expirySql = (a = '') =>
  `COALESCE(${a}registration_expires_at, (${a}registration_date + INTERVAL '${PET_RENEWAL_MONTHS} months')::date)`;

/** Extra columns for pet list queries: due date, days left, and a status bucket. */
export const renewalSelectSql = (a = '') => `
  ${expirySql(a)} AS renewal_due_date,
  (${expirySql(a)} - CURRENT_DATE) AS days_until_renewal,
  CASE
    WHEN ${a}is_archived IS TRUE THEN 'archived'
    WHEN ${expirySql(a)} < CURRENT_DATE THEN 'expired'
    WHEN ${expirySql(a)} <= CURRENT_DATE + ${EXPIRING_SOON_DAYS} THEN 'expiring'
    ELSE 'valid'
  END AS renewal_status`;

/** Pets that are never auto-archived: deceased (own lifecycle), reported lost, or currently impounded. */
const ELIGIBLE_SQL = `
  is_archived IS NOT TRUE
  AND COALESCE(status, 'Active') NOT IN ('Deceased', 'Lost')
  AND COALESCE(impound_status, 'None') IN ('None', '')
  AND ${expirySql()} < CURRENT_DATE`;

export async function getArchiveSettings() {
  const s = await query(`SELECT pet_archive_enabled FROM admin_settings ORDER BY id LIMIT 1`);
  const g = await query(`SELECT value FROM system_settings WHERE key='pet_archive_grace_until'`);
  const graceUntil: string | null = (g.rows[0] as any)?.value || null;
  const inGrace = graceUntil ? new Date(graceUntil + 'T23:59:59') >= new Date() : false;
  return {
    enabled: (s.rows[0] as any)?.pet_archive_enabled ?? true,
    graceUntil, inGrace, renewalMonths: PET_RENEWAL_MONTHS,
  };
}

export async function endGracePeriod(by: string) {
  await query(
    `INSERT INTO system_settings (key, value, updated_by, updated_at) VALUES ('pet_archive_grace_until', (CURRENT_DATE - 1)::text, $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
    [by]
  );
}

export async function listCandidates(limit = 500) {
  const r = await query(
    `SELECT id, pet_name, species, owner_name, barangay, ${expirySql()} AS renewal_due_date
     FROM pets WHERE ${ELIGIBLE_SQL} ORDER BY ${expirySql()} ASC LIMIT $1`, [limit]
  );
  return r.rows as any[];
}

export interface ArchiveRunResult {
  ran: boolean; dryRun: boolean; skipped?: string;
  candidates: number; archived: number; backupId?: string; sample?: any[];
}

export async function runPetArchive(opts: { dryRun?: boolean; triggeredBy?: string; ip?: string } = {}): Promise<ArchiveRunResult> {
  const dryRun = !!opts.dryRun;
  const by = opts.triggeredBy || 'system';
  const client = await pool.connect();
  let locked = false;
  try {
    const l = await client.query('SELECT pg_try_advisory_lock($1) AS ok', [ADVISORY_LOCK_KEY]);
    locked = l.rows[0].ok;
    if (!locked) return { ran: false, dryRun, skipped: 'Another archive run is in progress', candidates: 0, archived: 0 };

    const settings = await getArchiveSettings();
    const cands = await listCandidates();
    if (dryRun) return { ran: true, dryRun, candidates: cands.length, archived: 0, sample: cands.slice(0, 25) };

    if (!settings.enabled) return { ran: false, dryRun, skipped: 'Auto-archive is turned off in System Settings', candidates: cands.length, archived: 0 };
    if (settings.inGrace) return { ran: false, dryRun, skipped: `Grace period active until ${settings.graceUntil} — no records archived yet`, candidates: cands.length, archived: 0 };
    if (cands.length === 0) return { ran: true, dryRun, candidates: 0, archived: 0 };

    // Never bulk-hide records without a fresh snapshot. If a backup is already running, try next tick.
    if (isBusy()) return { ran: false, dryRun, skipped: 'A backup/restore is in progress — will retry next hour', candidates: cands.length, archived: 0 };
    let backupId: string;
    try {
      const b = await createBackup('pre-archive', by, `Automatic snapshot before archiving ${cands.length} expired pet registration(s)`);
      backupId = b.id;
    } catch (e: any) {
      return { ran: false, dryRun, skipped: `Safety backup failed, nothing archived: ${e.message}`, candidates: cands.length, archived: 0 };
    }

    const ids = cands.map(c => c.id);
    const upd = await client.query(
      `UPDATE pets SET is_archived = TRUE, archived_at = NOW(), archive_type = 'auto',
              archived_reason = 'Registration not renewed within ${PET_RENEWAL_MONTHS} months', updated_at = NOW()
       WHERE id = ANY($1::text[]) AND ${ELIGIBLE_SQL} RETURNING id`, [ids]
    );
    await query(
      `INSERT INTO audit_logs (user_id, username, user_role, action, resource, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [null, by, by === 'system' ? 'system' : 'admin', 'Auto_Archive_Pets', 'Pet',
       JSON.stringify({ archived: upd.rowCount, safetyBackupId: backupId, petIds: (upd.rows as any[]).map(r => r.id).slice(0, 200) }), opts.ip || null]
    ).catch(() => {});
    console.log(`[PetArchive] archived ${upd.rowCount} pet(s) with expired registrations (safety backup ${backupId})`);
    return { ran: true, dryRun, candidates: cands.length, archived: upd.rowCount || 0, backupId };
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

// ── Renew / restore / manual archive ────────────────────────────────────────
export class PetActionError extends Error { constructor(public status: number, msg: string) { super(msg); } }

/** Renew a registration for another period. Also restores it if archived. Early renewals keep the unused time. */
export async function renewPet(id: string, by: string, notes?: string, scopeBarangay?: string | null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query(
      `SELECT id, status, barangay, is_archived, ${expirySql()} AS due FROM pets WHERE id=$1 FOR UPDATE`, [id]
    );
    const pet: any = cur.rows[0];
    if (!pet) throw new PetActionError(404, 'Pet not found');
    if (scopeBarangay && pet.barangay !== scopeBarangay) throw new PetActionError(403, 'This pet is outside your assigned barangay');
    if (pet.status === 'Deceased') throw new PetActionError(409, 'A deceased pet cannot be renewed');

    const upd = await client.query(
      `UPDATE pets SET
         registration_expires_at = (GREATEST(CURRENT_DATE, CASE WHEN is_archived IS TRUE THEN CURRENT_DATE ELSE ${expirySql()} END)
                                    + INTERVAL '${PET_RENEWAL_MONTHS} months')::date,
         last_renewed_at = CURRENT_DATE, renewal_count = COALESCE(renewal_count,0) + 1,
         is_archived = FALSE, archived_at = NULL, archived_reason = NULL, archive_type = NULL, updated_at = NOW()
       WHERE id=$1 RETURNING registration_expires_at`, [id]
    );
    const newExpiry = (upd.rows[0] as any).registration_expires_at;
    await client.query(
      `INSERT INTO pet_renewals (pet_id, renewed_on, previous_expiry, new_expiry, was_archived, renewed_by, notes)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)`,
      [id, pet.due, newExpiry, !!pet.is_archived, by, notes || null]
    );
    await client.query('COMMIT');
    const out = await query(`SELECT *, ${renewalSelectSql()} FROM pets WHERE id=$1`, [id]);
    return { pet: out.rows[0], wasArchived: !!pet.is_archived };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { client.release(); }
}

export async function archivePet(id: string, reason: string | undefined) {
  const r = await query(
    `UPDATE pets SET is_archived = TRUE, archived_at = NOW(), archive_type = 'manual',
            archived_reason = $2, updated_at = NOW() WHERE id=$1 AND is_archived IS NOT TRUE RETURNING id`,
    [id, reason || 'Archived manually by staff']
  );
  if (!r.rows.length) {
    const ex = await query('SELECT is_archived FROM pets WHERE id=$1', [id]);
    if (!ex.rows.length) throw new PetActionError(404, 'Pet not found');
    throw new PetActionError(409, 'Pet is already archived');
  }
  const out = await query(`SELECT *, ${renewalSelectSql()} FROM pets WHERE id=$1`, [id]);
  return out.rows[0];
}

export async function renewalSummary(barangay?: string | null) {
  const params: any[] = []; let where = '';
  if (barangay) { params.push(barangay); where = 'WHERE barangay=$1'; }
  const r = await query(
    `SELECT
       COUNT(*) FILTER (WHERE is_archived IS TRUE)::int AS archived,
       COUNT(*) FILTER (WHERE is_archived IS NOT TRUE AND ${expirySql()} < CURRENT_DATE)::int AS expired,
       COUNT(*) FILTER (WHERE is_archived IS NOT TRUE AND ${expirySql()} >= CURRENT_DATE AND ${expirySql()} <= CURRENT_DATE + ${EXPIRING_SOON_DAYS})::int AS expiring,
       COUNT(*) FILTER (WHERE is_archived IS NOT TRUE AND ${expirySql()} > CURRENT_DATE + ${EXPIRING_SOON_DAYS})::int AS valid
     FROM pets ${where}`, params
  );
  return r.rows[0];
}

// ── Scheduler ───────────────────────────────────────────────────────────────
let timer: NodeJS.Timeout | null = null;
export function startPetArchiveScheduler() {
  if (timer) return;
  const tick = () => runPetArchive().catch(e => console.error('[PetArchive] tick error:', e.message));
  setTimeout(tick, FIRST_TICK_MS).unref();
  timer = setInterval(tick, TICK_MS); timer.unref();
  console.log('[PetArchive] auto-archive scheduler started (hourly)');
}
export function stopPetArchiveScheduler() { if (timer) clearInterval(timer); timer = null; }
