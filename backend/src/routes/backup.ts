import express, { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  createBackup, listBackups, getBackupFile, getBackupMeta, deleteBackup, importBackup,
  restoreBackup, verifyBackup, getBackupStatus, getBackupSettings, FREQUENCIES, normalizeFrequency,
} from '../services/backup';

const router = Router();

const audit = (req: AuthRequest, action: string, resourceId?: string, details?: object) => {
  query(
    `INSERT INTO audit_logs (user_id, username, user_role, action, resource, resource_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [req.user?.id, req.user?.username, req.user?.role, action, 'Backup', resourceId || null, JSON.stringify(details || {}), req.ip]
  ).catch(() => {});
};

const serialize = (b: any) => ({
  id: b.id, filename: b.filename, type: b.type, status: b.status, note: b.note,
  createdBy: b.created_by, sizeBytes: b.size_bytes != null ? Number(b.size_bytes) : null,
  uncompressedBytes: b.uncompressed_bytes != null ? Number(b.uncompressed_bytes) : null,
  tableCount: b.table_count, rowCount: b.row_count != null ? Number(b.row_count) : null,
  checksum: b.checksum, error: b.error, createdAt: b.created_at, completedAt: b.completed_at,
});

// Status: admins can see health (header/sidebar badges); everything else is superadmin only.
router.get('/status', authenticate, requireRole('admin', 'superadmin'), async (_req: AuthRequest, res: Response) => {
  try {
    const s = await getBackupStatus();
    return res.json({
      success: true,
      status: {
        health: s.health, autoBackup: s.autoBackup, frequency: s.frequency, retention: s.retention,
        lastBackup: s.lastBackup ? serialize(s.lastBackup) : null,
        lastAuto: s.lastAuto ? serialize(s.lastAuto) : null,
        lastError: s.lastError, nextDue: s.nextDue,
        totalBackups: s.totalBackups, totalBytes: s.totalBytes, mirrorDir: s.mirrorDir, busy: s.busy,
      },
    });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.use(authenticate, requireRole('superadmin'));

router.get('/', async (_req: AuthRequest, res: Response) => {
  try { return res.json({ success: true, backups: (await listBackups()).map(serialize) }); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Backup schedule settings (kept separate from /admin/settings so the two forms can't overwrite each other)
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { autoBackup, frequency, retention } = req.body || {};
    if (frequency !== undefined && !(FREQUENCIES as string[]).includes(frequency)) {
      return res.status(400).json({ error: `frequency must be one of: ${FREQUENCIES.join(', ')}` });
    }
    const ret = retention === undefined ? null : parseInt(retention);
    if (ret !== null && (isNaN(ret) || ret < 1 || ret > 365)) return res.status(400).json({ error: 'retention must be between 1 and 365' });

    const exists = await query('SELECT id FROM admin_settings LIMIT 1');
    if (exists.rows.length) {
      await query(
        `UPDATE admin_settings SET auto_backup = COALESCE($1, auto_backup), backup_frequency = COALESCE($2, backup_frequency),
                backup_retention = COALESCE($3, backup_retention), updated_at = NOW()`,
        [typeof autoBackup === 'boolean' ? autoBackup : null, frequency ?? null, ret]
      );
    } else {
      await query(`INSERT INTO admin_settings (auto_backup, backup_frequency, backup_retention) VALUES ($1,$2,$3)`,
        [autoBackup ?? true, frequency ?? 'daily', ret ?? 14]);
    }
    audit(req, 'Update_Backup_Settings', undefined, { autoBackup, frequency, retention: ret });
    return res.json({ success: true, settings: await getBackupSettings() });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : undefined;
    const b = await createBackup('manual', req.user?.username || null, note);
    audit(req, 'Create_Backup', b.id, { type: 'manual', rows: b.row_count, size: b.size_bytes });
    return res.json({ success: true, backup: serialize(b) });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

// Upload a backup file (raw body, application/octet-stream). Stored as 'imported'; restore is a separate, explicit step.
router.post('/import', express.raw({ type: '*/*', limit: '200mb' }), async (req: AuthRequest, res: Response) => {
  try {
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'No file received.' });
    const name = typeof req.query.filename === 'string' ? req.query.filename : undefined;
    const b = await importBackup(req.body, req.user?.username || null, name);
    audit(req, 'Import_Backup', b.id, { filename: name, rows: b.row_count });
    return res.json({ success: true, backup: serialize(b) });
  } catch (err: any) { return res.status(400).json({ error: err.message }); }
});

router.get('/:id/download', async (req: AuthRequest, res: Response) => {
  try {
    const f = await getBackupFile(req.params.id);
    if (!f) return res.status(404).json({ error: 'Backup not found or has no data.' });
    audit(req, 'Download_Backup', req.params.id);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${f.meta.filename}"`);
    res.setHeader('Content-Length', String(f.data.length));
    return res.end(f.data);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post('/:id/verify', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await getBackupMeta(req.params.id))) return res.status(404).json({ error: 'Backup not found.' });
    return res.json({ success: true, result: await verifyBackup(req.params.id) });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  try {
    if (req.body?.confirm !== 'RESTORE') return res.status(400).json({ error: 'Confirmation required: send {"confirm":"RESTORE"}.' });
    const meta = await getBackupMeta(req.params.id);
    if (!meta) return res.status(404).json({ error: 'Backup not found.' });
    if (meta.status !== 'completed') return res.status(400).json({ error: 'Only completed backups can be restored.' });
    const result = await restoreBackup(req.params.id, req.user?.username || null);
    audit(req, 'Restore_Backup', req.params.id, result);
    return res.json({ success: true, result });
  } catch (err: any) {
    audit(req, 'Restore_Backup_Failed', req.params.id, { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await deleteBackup(req.params.id))) return res.status(404).json({ error: 'Backup not found.' });
    audit(req, 'Delete_Backup', req.params.id);
    return res.json({ success: true });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
