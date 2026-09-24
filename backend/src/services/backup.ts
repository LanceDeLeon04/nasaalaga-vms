/**
 * NASaAlaga backup service
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure Node + pg (no pg_dump dependency, so it works on Railway/Nixpacks where
 * the PostgreSQL client tools are not installed).
 *
 *  • createBackup()      consistent snapshot of every public table → gzip JSON
 *  • verifyBackup()      checksum + structure + row-count integrity check
 *  • restoreBackup()     transactional, all-or-nothing restore (auto pre-restore snapshot)
 *  • startBackupScheduler()  auto-backup job (honours admin_settings), multi-instance safe
 *
 * Backups are stored in the `backups` table (BYTEA) so they survive redeploys,
 * and optionally mirrored to BACKUP_DIR (e.g. a Railway volume) as .json.gz files.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import pool, { query } from '../db';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// ── Constants ───────────────────────────────────────────────────────────────
export const BACKUP_FORMAT = 'nasaalaga-backup';
export const BACKUP_VERSION = 1;

/** Never snapshotted / restored: the backups themselves + short-lived OTP codes. */
const EXCLUDED_TABLES = new Set(['backups', 'otp_store']);

const INSERT_CHUNK = 500;
const SCHEDULER_TICK_MS = 5 * 60 * 1000;   // check every 5 minutes
const SCHEDULER_FIRST_TICK_MS = 45 * 1000; // catch up shortly after boot
const FAILURE_BACKOFF_MS = 15 * 60 * 1000; // after a failed auto backup wait 15 min
const ADVISORY_LOCK_KEY = 7382011;         // arbitrary app-wide constant

export type BackupType = 'manual' | 'auto' | 'pre-restore' | 'pre-clear' | 'imported';
export type Frequency = 'hourly' | 'every_6_hours' | 'daily' | 'weekly';

export const FREQUENCY_MS: Record<Frequency, number> = {
  hourly: 60 * 60 * 1000,
  every_6_hours: 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};
export const FREQUENCIES = Object.keys(FREQUENCY_MS) as Frequency[];

export function normalizeFrequency(v: any): Frequency {
  const s = String(v || '').toLowerCase();
  if ((FREQUENCIES as string[]).includes(s)) return s as Frequency;
  if (s.includes('week')) return 'weekly';
  if (s.includes('6')) return 'every_6_hours';
  if (s.includes('hour')) return 'hourly';
  return 'daily';
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const qi = (ident: string) => '"' + ident.replace(/"/g, '""') + '"';

let busy: string | null = null; // in-process mutex: 'backup' | 'restore'

export function isBusy() { return busy; }

async function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (busy) throw new Error(`Another ${busy} operation is already in progress. Please wait for it to finish.`);
  busy = name;
  try { return await fn(); } finally { busy = null; }
}

function newId() {
  return `BKP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function makeFilename(type: string, d = new Date()) {
  const ts = d.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  return `nasaalaga-${type}-${ts}.json.gz`;
}

type Queryable = { query: (text: string, params?: any[]) => Promise<any> };

async function listPublicTables(client: Queryable): Promise<string[]> {
  const r = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`
  );
  return (r.rows as any[]).map(x => x.table_name).filter((t: string) => !EXCLUDED_TABLES.has(t));
}

interface ColumnInfo { name: string; type: string; insertable: boolean; identityAlways: boolean }

async function getColumns(client: Queryable, table: string): Promise<ColumnInfo[]> {
  const r = await client.query(
    `SELECT column_name, data_type, udt_name, is_generated, identity_generation
     FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table]
  );
  return (r.rows as any[]).map(c => ({
    name: c.column_name,
    type: c.data_type === 'USER-DEFINED' || c.data_type === 'ARRAY' ? c.udt_name : c.data_type,
    insertable: c.is_generated !== 'ALWAYS',
    identityAlways: c.identity_generation === 'ALWAYS',
  }));
}

/** Tables sorted so that referenced (parent) tables come before the tables that reference them. */
async function fkOrder(client: Queryable, tables: string[]): Promise<string[]> {
  const set = new Set(tables);
  const r = await client.query(
    `SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent
     FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE c.contype='f' AND n.nspname='public'`
  );
  const strip = (s: string) => s.replace(/^public\./, '').replace(/^"|"$/g, '');
  const deps = new Map<string, Set<string>>(tables.map(t => [t, new Set<string>()]));
  for (const row of r.rows as any[]) {
    const child = strip(row.child), parent = strip(row.parent);
    if (child !== parent && set.has(child) && set.has(parent)) deps.get(child)!.add(parent);
  }
  const out: string[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();
  const visit = (t: string) => {
    if (done.has(t)) return;
    if (visiting.has(t)) return; // cycle — tolerated (replica mode / deferred handles it)
    visiting.add(t);
    deps.get(t)!.forEach(visit);
    visiting.delete(t);
    done.add(t);
    out.push(t);
  };
  tables.forEach(visit);
  return out;
}

// ── Payload (in-memory representation of a backup file) ─────────────────────
interface BackupPayload {
  format: string;
  version: number;
  createdAt: string;
  appVersion?: string;
  pgVersion?: string;
  tables: Record<string, { columns: { name: string; type: string }[]; rowCount: number; rows: any[] }>;
}

async function buildPayload(): Promise<{ payload: BackupPayload; tableCount: number; rowCount: number }> {
  const client = await pool.connect();
  try {
    // One consistent snapshot across all tables (no torn reads while users keep working).
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const ver = await client.query('SHOW server_version');
    const tables = await listPublicTables(client);
    const payload: BackupPayload = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      pgVersion: ver.rows[0]?.server_version,
      tables: {},
    };
    let rowCount = 0;
    for (const t of tables) {
      const cols = await getColumns(client, t);
      // row_to_json keeps Postgres' exact text form (µs timestamps, bytea as \x hex, jsonb, arrays…)
      const rows = await client.query(`SELECT row_to_json(t) AS r FROM ${qi(t)} t`);
      payload.tables[t] = {
        columns: cols.map(c => ({ name: c.name, type: c.type })),
        rowCount: rows.rows.length,
        rows: rows.rows.map((x: any) => x.r),
      };
      rowCount += rows.rows.length;
    }
    await client.query('COMMIT');
    return { payload, tableCount: tables.length, rowCount };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function encode(payload: BackupPayload) {
  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  const gz = await gzip(json, { level: 6 });
  return { gz, uncompressed: json.length, checksum: crypto.createHash('sha256').update(gz).digest('hex') };
}

export async function decode(buf: Buffer): Promise<BackupPayload> {
  const raw = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b ? await gunzip(buf) : buf;
  let payload: any;
  try { payload = JSON.parse(raw.toString('utf8')); }
  catch { throw new Error('File is not a valid NASaAlaga backup (unreadable JSON).'); }
  validatePayload(payload);
  return payload as BackupPayload;
}

function validatePayload(p: any) {
  if (!p || p.format !== BACKUP_FORMAT) throw new Error('File is not a NASaAlaga backup (wrong format marker).');
  if (typeof p.version !== 'number' || p.version > BACKUP_VERSION) {
    throw new Error(`Unsupported backup version ${p.version}. This server supports up to v${BACKUP_VERSION}.`);
  }
  if (!p.tables || typeof p.tables !== 'object') throw new Error('Backup contains no table data.');
  for (const [name, t] of Object.entries<any>(p.tables)) {
    if (!t || !Array.isArray(t.rows) || !Array.isArray(t.columns)) throw new Error(`Backup table "${name}" is malformed.`);
    if (typeof t.rowCount === 'number' && t.rowCount !== t.rows.length) {
      throw new Error(`Backup table "${name}" is truncated/corrupt (expected ${t.rowCount} rows, found ${t.rows.length}).`);
    }
  }
}

// ── Optional filesystem mirror (BACKUP_DIR, e.g. a Railway volume) ──────────
function mirrorDir(): string | null {
  const dir = process.env.BACKUP_DIR;
  if (!dir) return null;
  try { fs.mkdirSync(dir, { recursive: true }); return dir; }
  catch (e) { console.warn('[Backup] BACKUP_DIR unusable, skipping file mirror:', (e as Error).message); return null; }
}

async function mirrorWrite(filename: string, gz: Buffer) {
  const dir = mirrorDir();
  if (!dir) return;
  try { await fs.promises.writeFile(path.join(dir, filename), gz); }
  catch (e) { console.warn('[Backup] file mirror write failed:', (e as Error).message); }
}

async function mirrorDelete(filename: string) {
  const dir = mirrorDir();
  if (!dir) return;
  await fs.promises.unlink(path.join(dir, path.basename(filename))).catch(() => {});
}

// ── Create ──────────────────────────────────────────────────────────────────
export interface BackupRow {
  id: string; filename: string; type: BackupType; status: string; note: string | null;
  created_by: string | null; size_bytes: string | null; uncompressed_bytes: string | null;
  table_count: number | null; row_count: string | null; checksum: string | null;
  error: string | null; created_at: string; completed_at: string | null;
}

const META_COLS = `id, filename, type, status, note, created_by, size_bytes, uncompressed_bytes,
                   table_count, row_count, checksum, error, created_at, completed_at`;

/**
 * Create a backup. `alreadyLocked` is used internally by restore (which already holds the lock).
 * Always leaves a row in `backups` — status 'completed' or 'failed' with the error text.
 */
export async function createBackup(
  type: BackupType,
  createdBy: string | null,
  note?: string,
  opts: { alreadyLocked?: boolean } = {}
): Promise<BackupRow> {
  const run = async () => {
    const id = newId();
    const filename = makeFilename(type);
    await query(
      `INSERT INTO backups (id, filename, type, status, note, created_by) VALUES ($1,$2,$3,'running',$4,$5)`,
      [id, filename, type, note || null, createdBy]
    );
    try {
      const { payload, tableCount, rowCount } = await buildPayload();
      const { gz, uncompressed, checksum } = await encode(payload);
      await query(
        `UPDATE backups SET status='completed', data=$2, size_bytes=$3, uncompressed_bytes=$4,
                table_count=$5, row_count=$6, checksum=$7, completed_at=NOW() WHERE id=$1`,
        [id, gz, gz.length, uncompressed, tableCount, rowCount, checksum]
      );
      await mirrorWrite(filename, gz);
      console.log(`[Backup] ${type} backup ${id} OK — ${tableCount} tables, ${rowCount} rows, ${(gz.length / 1024).toFixed(1)} KB`);
    } catch (e: any) {
      console.error(`[Backup] ${type} backup ${id} FAILED:`, e);
      await query(`UPDATE backups SET status='failed', error=$2, completed_at=NOW(), data=NULL WHERE id=$1`,
        [id, String(e?.message || e).slice(0, 2000)]).catch(() => {});
      throw new Error(`Backup failed: ${e?.message || e}`);
    }
    const row = await getBackupMeta(id);
    await applyRetention().catch(err => console.warn('[Backup] retention error:', err));
    return row!;
  };
  return opts.alreadyLocked ? run() : withLock('backup', run);
}

export async function getBackupMeta(id: string): Promise<BackupRow | null> {
  const r = await query(`SELECT ${META_COLS} FROM backups WHERE id=$1`, [id]);
  return (r.rows[0] as BackupRow) || null;
}

export async function listBackups(limit = 100): Promise<BackupRow[]> {
  const r = await query(`SELECT ${META_COLS} FROM backups ORDER BY created_at DESC LIMIT $1`, [limit]);
  return r.rows as BackupRow[];
}

export async function getBackupFile(id: string): Promise<{ meta: BackupRow; data: Buffer } | null> {
  const r = await query(`SELECT ${META_COLS}, data FROM backups WHERE id=$1`, [id]);
  const row: any = r.rows[0];
  if (!row) return null;
  const { data, ...meta } = row;
  if (!data) return null;
  return { meta: meta as BackupRow, data };
}

export async function deleteBackup(id: string): Promise<boolean> {
  const r = await query(`DELETE FROM backups WHERE id=$1 RETURNING filename`, [id]);
  if (r.rows[0]) await mirrorDelete((r.rows[0] as any).filename);
  return r.rowCount! > 0;
}

/** Store an uploaded file as an 'imported' backup (validated, not yet restored). */
export async function importBackup(buf: Buffer, createdBy: string | null, originalName?: string): Promise<BackupRow> {
  const payload = await decode(buf); // throws on invalid
  const { gz, uncompressed, checksum } = await encode(payload);
  const tables = Object.keys(payload.tables);
  const rowCount = tables.reduce((n, t) => n + payload.tables[t].rows.length, 0);
  const id = newId();
  const filename = makeFilename('imported');
  await query(
    `INSERT INTO backups (id, filename, type, status, note, created_by, size_bytes, uncompressed_bytes, table_count, row_count, checksum, data, completed_at)
     VALUES ($1,$2,'imported','completed',$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
    [id, filename, `Imported from ${originalName || 'uploaded file'} (originally created ${payload.createdAt})`,
     createdBy, gz.length, uncompressed, tables.length, rowCount, checksum, gz]
  );
  await mirrorWrite(filename, gz);
  return (await getBackupMeta(id))!;
}

// ── Retention ───────────────────────────────────────────────────────────────
export async function getBackupSettings() {
  const r = await query('SELECT auto_backup, backup_frequency, backup_retention FROM admin_settings ORDER BY id LIMIT 1');
  const s: any = r.rows[0] || {};
  return {
    autoBackup: s.auto_backup ?? true,
    frequency: normalizeFrequency(s.backup_frequency),
    retention: Math.min(365, Math.max(1, parseInt(s.backup_retention) || 14)),
  };
}

async function pruneType(types: string[], keep: number) {
  const r = await query(
    `DELETE FROM backups WHERE id IN (
       SELECT id FROM backups WHERE type = ANY($1) AND status='completed'
       ORDER BY created_at DESC OFFSET $2
     ) RETURNING filename`,
    [types, keep]
  );
  for (const row of r.rows as any[]) await mirrorDelete(row.filename);
}

export async function applyRetention() {
  const { retention } = await getBackupSettings();
  await pruneType(['auto'], retention);                     // scheduled: per admin setting
  await pruneType(['pre-restore', 'pre-clear'], 10);        // safety snapshots: newest 10
  // Manual & imported backups are never auto-deleted. Failed rows older than 30 days are just noise.
  await query(`DELETE FROM backups WHERE status='failed' AND created_at < NOW() - INTERVAL '30 days'`);
}

// ── Verify ──────────────────────────────────────────────────────────────────
export interface VerifyResult { ok: boolean; checks: { name: string; ok: boolean; detail?: string }[]; tables?: number; rows?: number }

export async function verifyBackup(id: string): Promise<VerifyResult> {
  const checks: VerifyResult['checks'] = [];
  const file = await getBackupFile(id);
  if (!file) return { ok: false, checks: [{ name: 'Backup data present', ok: false, detail: 'No data stored for this backup (failed or deleted).' }] };
  checks.push({ name: 'Backup data present', ok: true, detail: `${file.data.length} bytes` });

  const sum = crypto.createHash('sha256').update(file.data).digest('hex');
  const sumOk = !file.meta.checksum || sum === file.meta.checksum;
  checks.push({ name: 'SHA-256 checksum', ok: sumOk, detail: sumOk ? sum.slice(0, 16) + '…' : 'Stored checksum does not match — data is corrupted.' });
  if (!sumOk) return { ok: false, checks };

  try {
    const payload = await decode(file.data);
    const names = Object.keys(payload.tables);
    const rows = names.reduce((n, t) => n + payload.tables[t].rows.length, 0);
    checks.push({ name: 'File structure & row counts', ok: true, detail: `${names.length} tables, ${rows} rows` });

    const current = await listPublicTables(pool);
    const missing = current.filter(t => !payload.tables[t]);
    const extra = names.filter(t => !current.includes(t));
    checks.push({
      name: 'Schema compatibility',
      ok: true,
      detail: missing.length || extra.length
        ? `Tables not in backup (left untouched on restore): ${missing.join(', ') || 'none'}. Tables in backup missing from DB (skipped): ${extra.join(', ') || 'none'}.`
        : 'Matches current database.',
    });
    return { ok: true, checks, tables: names.length, rows };
  } catch (e: any) {
    checks.push({ name: 'File structure & row counts', ok: false, detail: e.message });
    return { ok: false, checks };
  }
}

// ── Restore ─────────────────────────────────────────────────────────────────
export interface RestoreResult {
  restoredTables: number; restoredRows: number;
  skippedTables: string[];        // in backup, not in DB
  untouchedTables: string[];      // in DB, not in backup
  preRestoreBackupId: string;
}

export async function restoreBackup(id: string, performedBy: string | null): Promise<RestoreResult> {
  return withLock('restore', async () => {
    const file = await getBackupFile(id);
    if (!file) throw new Error('Backup not found or has no data.');
    if (file.meta.checksum) {
      const sum = crypto.createHash('sha256').update(file.data).digest('hex');
      if (sum !== file.meta.checksum) throw new Error('Backup failed its integrity check (checksum mismatch). Restore aborted — nothing was changed.');
    }
    const payload = await decode(file.data);

    // Safety net: snapshot the current state first. If this fails we do NOT proceed.
    const pre = await createBackup('pre-restore', performedBy, `Automatic snapshot before restoring ${id}`, { alreadyLocked: true });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL lock_timeout = '30s'`);

      // Prefer replica role (skips FK/trigger checks — needs superuser); otherwise rely on FK ordering.
      let replica = false;
      try {
        await client.query('SAVEPOINT rr');
        await client.query(`SET LOCAL session_replication_role = 'replica'`);
        await client.query('RELEASE SAVEPOINT rr');
        replica = true;
      } catch { await client.query('ROLLBACK TO SAVEPOINT rr'); }

      const current = await listPublicTables(client);
      const inBackup = Object.keys(payload.tables).filter(t => !EXCLUDED_TABLES.has(t));
      const targets = inBackup.filter(t => current.includes(t));
      const ordered = await fkOrder(client, targets);

      // 1) clear children first, parents last
      for (const t of [...ordered].reverse()) await client.query(`DELETE FROM ${qi(t)}`);

      // 2) insert parents first
      let restoredRows = 0;
      for (const t of ordered) {
        const src = payload.tables[t];
        const curCols = await getColumns(client, t);
        const curByName = new Map(curCols.map(c => [c.name, c]));
        const cols = src.columns.map(c => c.name).filter(n => curByName.get(n)?.insertable);
        if (!cols.length || !src.rows.length) continue;
        const colList = cols.map(qi).join(', ');
        const override = cols.some(n => curByName.get(n)!.identityAlways) ? ' OVERRIDING SYSTEM VALUE' : '';
        for (let i = 0; i < src.rows.length; i += INSERT_CHUNK) {
          const chunk = src.rows.slice(i, i + INSERT_CHUNK);
          await client.query(
            `INSERT INTO ${qi(t)} (${colList})${override}
             SELECT ${colList} FROM json_populate_recordset(null::${qi(t)}, $1::json)`,
            [JSON.stringify(chunk)]
          );
        }
        const cnt = await client.query(`SELECT COUNT(*)::int AS n FROM ${qi(t)}`);
        if (cnt.rows[0].n !== src.rows.length) {
          throw new Error(`Row count mismatch restoring "${t}" (expected ${src.rows.length}, got ${cnt.rows[0].n}).`);
        }
        restoredRows += src.rows.length;
      }

      // 3) fix serial/identity sequences so new inserts don't collide with restored ids
      for (const t of ordered) {
        const cols = await getColumns(client, t);
        for (const c of cols) {
          const seq = await client.query(`SELECT pg_get_serial_sequence($1, $2) AS s`, [`public.${qi(t)}`, c.name]);
          const s = seq.rows[0]?.s;
          if (s) await client.query(`SELECT setval($1, COALESCE((SELECT MAX(${qi(c.name)}) FROM ${qi(t)}), 0) + 1, false)`, [s]);
        }
      }

      await client.query('COMMIT');
      console.log(`[Backup] restore of ${id} complete — ${ordered.length} tables, ${restoredRows} rows (replica mode: ${replica})`);
      return {
        restoredTables: ordered.length,
        restoredRows,
        skippedTables: inBackup.filter(t => !current.includes(t)),
        untouchedTables: current.filter(t => !inBackup.includes(t)),
        preRestoreBackupId: pre.id,
      };
    } catch (e: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[Backup] restore FAILED, rolled back:', e);
      throw new Error(`Restore failed and was rolled back — your data is unchanged. Reason: ${e?.message || e}`);
    } finally {
      client.release();
    }
  });
}

// ── Status (drives the header/sidebar/panel health badges) ──────────────────
export async function getBackupStatus() {
  const settings = await getBackupSettings();
  const last = await query(
    `SELECT ${META_COLS} FROM backups WHERE status='completed' AND type IN ('auto','manual') ORDER BY created_at DESC LIMIT 1`
  );
  const lastAny = await query(`SELECT ${META_COLS} FROM backups WHERE type='auto' ORDER BY created_at DESC LIMIT 1`);
  const totals = await query(
    `SELECT COUNT(*) FILTER (WHERE status='completed')::int AS count,
            COALESCE(SUM(size_bytes) FILTER (WHERE status='completed'),0)::bigint AS bytes
     FROM backups`
  );
  const lastBackup = (last.rows[0] as BackupRow) || null;
  const lastAuto = (lastAny.rows[0] as BackupRow) || null;
  const interval = FREQUENCY_MS[settings.frequency];
  const age = lastBackup ? Date.now() - new Date(lastBackup.created_at).getTime() : null;

  let health: 'healthy' | 'stale' | 'failing' | 'never' | 'disabled';
  if (lastAuto && lastAuto.status === 'failed' && (!lastBackup || new Date(lastAuto.created_at) > new Date(lastBackup.created_at))) health = 'failing';
  else if (!lastBackup) health = settings.autoBackup ? 'never' : 'disabled';
  else if (settings.autoBackup && age! > interval * 2 + SCHEDULER_TICK_MS) health = 'stale';
  else if (!settings.autoBackup && age! > 7 * 24 * 3600 * 1000) health = 'disabled';
  else health = 'healthy';

  const nextDue = settings.autoBackup
    ? new Date((lastAuto && lastAuto.status === 'completed' ? new Date(lastAuto.created_at).getTime() : Date.now()) + interval).toISOString()
    : null;

  return {
    ...settings,
    health,
    lastBackup, lastAuto,
    lastError: lastAuto?.status === 'failed' ? lastAuto.error : null,
    nextDue,
    totalBackups: totals.rows[0].count,
    totalBytes: Number(totals.rows[0].bytes),
    mirrorDir: process.env.BACKUP_DIR || null,
    busy,
  };
}

// ── Scheduler ───────────────────────────────────────────────────────────────
let schedulerTimer: NodeJS.Timeout | null = null;

async function schedulerTick() {
  if (busy) return;
  const client = await pool.connect();
  let locked = false;
  try {
    // Only one app instance (or overlapping deploy) may run the job at a time.
    const l = await client.query('SELECT pg_try_advisory_lock($1) AS ok', [ADVISORY_LOCK_KEY]);
    locked = l.rows[0].ok;
    if (!locked) return;

    const s = await getBackupSettings();
    if (!s.autoBackup) return;

    const r = await client.query(
      `SELECT status, created_at FROM backups WHERE type='auto' AND status IN ('completed','failed') ORDER BY created_at DESC LIMIT 1`
    );
    const last: any = r.rows[0];
    const lastTs = last ? new Date(last.created_at).getTime() : 0;
    const now = Date.now();
    if (last?.status === 'failed' && now - lastTs < FAILURE_BACKOFF_MS) return; // back off after a failure

    const lastOk = await client.query(`SELECT created_at FROM backups WHERE type='auto' AND status='completed' ORDER BY created_at DESC LIMIT 1`);
    const lastOkTs = lastOk.rows[0] ? new Date((lastOk.rows[0] as any).created_at).getTime() : 0;
    const due = now - lastOkTs >= FREQUENCY_MS[s.frequency] - 60 * 1000; // 1 min tolerance
    if (!due) return;

    console.log(`[Backup] auto backup due (frequency: ${s.frequency}) — starting`);
    await createBackup('auto', 'system', `Scheduled ${s.frequency.replace(/_/g, ' ')} backup`);
  } catch (e) {
    console.error('[Backup] scheduler tick error:', (e as Error).message);
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

export function startBackupScheduler() {
  if (schedulerTimer) return;
  console.log(`[Backup] auto-backup scheduler started (checks every ${SCHEDULER_TICK_MS / 60000} min)`);
  setTimeout(() => { schedulerTick().catch(() => {}); }, SCHEDULER_FIRST_TICK_MS).unref();
  schedulerTimer = setInterval(() => { schedulerTick().catch(() => {}); }, SCHEDULER_TICK_MS);
  schedulerTimer.unref();
}

export function stopBackupScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
}
