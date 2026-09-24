import { useEffect, useRef, useState, useCallback } from 'react';
import {
  HardDriveDownload, Download, Upload, RotateCcw, Trash2, ShieldCheck, RefreshCw,
  CheckCircle, AlertTriangle, XCircle, Clock, Database,
} from 'lucide-react';
import { api } from '../lib/api';
import { timeAgo } from '../hooks/useBackupStatus';

interface BackupItem {
  id: string; filename: string; type: 'manual' | 'auto' | 'pre-restore' | 'pre-clear' | 'imported';
  status: 'running' | 'completed' | 'failed'; note: string | null; createdBy: string | null;
  sizeBytes: number | null; tableCount: number | null; rowCount: number | null;
  error: string | null; createdAt: string;
}

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  manual: { label: 'Manual', cls: 'bg-blue-100 text-blue-700' },
  auto: { label: 'Scheduled', cls: 'bg-green-100 text-green-700' },
  'pre-restore': { label: 'Before restore', cls: 'bg-amber-100 text-amber-700' },
  'pre-clear': { label: 'Before clear', cls: 'bg-amber-100 text-amber-700' },
  imported: { label: 'Uploaded', cls: 'bg-purple-100 text-purple-700' },
};

const FREQ_OPTIONS = [
  { value: 'hourly', label: 'Every hour' },
  { value: 'every_6_hours', label: 'Every 6 hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const HEALTH_UI: Record<string, { cls: string; icon: any; title: string }> = {
  healthy: { cls: 'border-green-300 bg-green-50 text-green-800', icon: CheckCircle, title: 'Backups are healthy' },
  stale: { cls: 'border-amber-300 bg-amber-50 text-amber-800', icon: AlertTriangle, title: 'Backups are overdue' },
  failing: { cls: 'border-red-300 bg-red-50 text-red-800', icon: XCircle, title: 'Last scheduled backup failed' },
  never: { cls: 'border-amber-300 bg-amber-50 text-amber-800', icon: AlertTriangle, title: 'No backup has been taken yet' },
  disabled: { cls: 'border-gray-300 bg-gray-50 text-gray-700', icon: AlertTriangle, title: 'Automatic backups are turned off' },
};

const fmtBytes = (n?: number | null) => {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

interface Props {
  /** Ask the parent to run the email-OTP identity check, then call `run` when confirmed. */
  requestOtp: (opts: { title: string; warning: string; confirmLabel: string; run: () => Promise<void> }) => void;
}

export function BackupManager({ requestOtp }: Props) {
  const [status, setStatus] = useState<any>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ id: string; result: any } | null>(null);
  const [cfg, setCfg] = useState<{ autoBackup: boolean; frequency: string; retention: number } | null>(null);
  const [savingCfg, setSavingCfg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([api.getBackupStatus(), api.listBackups()]);
      setStatus(s.status);
      setBackups(l.backups || []);
      setCfg(c => c ?? { autoBackup: s.status.autoBackup, frequency: s.status.frequency, retention: s.status.retention });
    } catch (e: any) { setMsg({ kind: 'err', text: e.message }); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  const notifyChanged = () => { window.dispatchEvent(new Event('nasaalaga_backup_changed')); load(); };
  const flash = (kind: 'ok' | 'err', text: string) => { setMsg({ kind, text }); setTimeout(() => setMsg(m => (m?.text === text ? null : m)), 8000); };

  const backupNow = async () => {
    setCreating(true); setMsg(null);
    try { const r = await api.createBackup(note.trim() || undefined); setNote(''); flash('ok', `Backup created — ${r.backup.tableCount} tables, ${r.backup.rowCount} rows (${fmtBytes(r.backup.sizeBytes)}).`); notifyChanged(); }
    catch (e: any) { flash('err', e.message); notifyChanged(); }
    setCreating(false);
  };

  const saveCfg = async () => {
    if (!cfg) return;
    setSavingCfg(true);
    try { await api.updateBackupSettings(cfg); flash('ok', 'Backup schedule saved.'); notifyChanged(); }
    catch (e: any) { flash('err', e.message); }
    setSavingCfg(false);
  };

  const download = async (b: BackupItem) => {
    setBusyId(b.id);
    try { await api.downloadBackup(b.id, b.filename); } catch (e: any) { flash('err', e.message); }
    setBusyId(null);
  };

  const verify = async (b: BackupItem) => {
    setBusyId(b.id);
    try { const r = await api.verifyBackup(b.id); setVerifyResult({ id: b.id, result: r.result }); }
    catch (e: any) { flash('err', e.message); }
    setBusyId(null);
  };

  const remove = async (b: BackupItem) => {
    if (!confirm(`Delete backup "${b.filename}"? This cannot be undone.`)) return;
    setBusyId(b.id);
    try { await api.deleteBackup(b.id); notifyChanged(); } catch (e: any) { flash('err', e.message); }
    setBusyId(null);
  };

  const restore = (b: BackupItem) => {
    const typed = prompt(
      `RESTORE DATABASE\n\nThis replaces ALL current data with the backup from ${new Date(b.createdAt).toLocaleString()} ` +
      `(${b.rowCount} rows). A safety snapshot of the current data is taken first.\n\nType RESTORE to continue:`
    );
    if (typed !== 'RESTORE') { if (typed !== null) flash('err', 'Restore cancelled — confirmation text did not match.'); return; }
    requestOtp({
      title: 'Confirm database restore',
      warning: `All current data will be replaced with the backup from ${new Date(b.createdAt).toLocaleString()}.`,
      confirmLabel: 'Confirm & Restore',
      run: async () => {
        setBusyId(b.id); setMsg(null);
        try {
          const r = await api.restoreBackup(b.id);
          flash('ok', `Restore complete — ${r.result.restoredRows} rows across ${r.result.restoredTables} tables. Pre-restore snapshot: ${r.result.preRestoreBackupId}. Reloading…`);
          notifyChanged();
          setTimeout(() => window.location.reload(), 2500);
        } catch (e: any) { flash('err', e.message); }
        setBusyId(null);
      },
    });
  };

  const onFile = async (f?: File | null) => {
    if (!f) return;
    setCreating(true);
    try { const r = await api.importBackup(f); flash('ok', `Uploaded "${f.name}" (${r.backup.rowCount} rows). Review it below and press Restore when ready.`); notifyChanged(); }
    catch (e: any) { flash('err', e.message); }
    setCreating(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) return <div className="p-10 text-center text-gray-500 text-sm">Loading backups…</div>;

  const health = HEALTH_UI[status?.health] || HEALTH_UI.healthy;
  const HealthIcon = health.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 px-6 py-5">
        <h2 className="text-white font-bold text-lg flex items-center gap-2"><HardDriveDownload className="w-5 h-5" /> Backup &amp; Restore</h2>
        <p className="text-emerald-100 text-sm mt-1">Full database snapshots · automatic schedule · one-click verified restore</p>
      </div>

      <div className="p-6 space-y-6">
        {msg && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${msg.kind === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{msg.text}</div>
        )}

        {/* Health */}
        <div className={`rounded-xl border-2 p-4 flex items-start gap-3 ${health.cls}`}>
          <HealthIcon className="w-6 h-6 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold">{health.title}</p>
            <p className="mt-0.5">
              Last successful backup: <strong>{status?.lastBackup ? `${timeAgo(status.lastBackup.createdAt)} (${new Date(status.lastBackup.createdAt).toLocaleString()})` : 'never'}</strong>
              {status?.nextDue && <> · Next scheduled: <strong>{new Date(status.nextDue).toLocaleString()}</strong></>}
            </p>
            {status?.lastError && <p className="mt-1 text-xs">Error: {status.lastError}</p>}
            <p className="mt-1 text-xs opacity-80">{status?.totalBackups} stored · {fmtBytes(status?.totalBytes)} used{status?.mirrorDir ? ` · mirrored to ${status.mirrorDir}` : ''}</p>
          </div>
        </div>

        {/* Backup now */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Database className="w-4 h-4 text-emerald-700" /> Create backup now</h3>
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Optional note (e.g. before year-end cleanup)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
            <div className="flex gap-2">
              <button onClick={backupNow} disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-800 disabled:opacity-60">
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDriveDownload className="w-4 h-4" />}{creating ? 'Working…' : 'Backup now'}
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={creating}
                className="flex items-center gap-2 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-60" title="Upload a .json.gz backup file">
                <Upload className="w-4 h-4" /> Upload
              </button>
              <input ref={fileRef} type="file" accept=".gz,.json,application/gzip,application/json" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
            </div>
          </div>

          {/* Schedule */}
          {cfg && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-700" /> Automatic backups</h3>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Enabled</span>
                <button onClick={() => setCfg(c => c && ({ ...c, autoBackup: !c.autoBackup }))}
                  className={`relative w-12 h-6 rounded-full transition-all ${cfg.autoBackup ? 'bg-[#60A85C]' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${cfg.autoBackup ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Frequency</label>
                  <select value={cfg.frequency} onChange={e => setCfg(c => c && ({ ...c, frequency: e.target.value }))} disabled={!cfg.autoBackup}
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm disabled:opacity-50">
                    {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Keep last</label>
                  <input type="number" min={1} max={365} value={cfg.retention} disabled={!cfg.autoBackup}
                    onChange={e => setCfg(c => c && ({ ...c, retention: Math.max(1, Math.min(365, parseInt(e.target.value) || 1)) }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm disabled:opacity-50" />
                </div>
              </div>
              <button onClick={saveCfg} disabled={savingCfg}
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-900 disabled:opacity-60">{savingCfg ? 'Saving…' : 'Save schedule'}</button>
            </div>
          )}
        </div>

        {/* List */}
        <div>
          <h3 className="font-bold text-gray-800 text-sm mb-3">Stored backups ({backups.length})</h3>
          {backups.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-6 text-center">No backups yet. Press “Backup now” to create the first one.</p>
          ) : (
            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {backups.map(b => {
                const t = TYPE_LABEL[b.type] || TYPE_LABEL.manual;
                const ok = b.status === 'completed';
                const working = busyId === b.id;
                return (
                  <div key={b.id} className={`border rounded-xl p-3 ${b.status === 'failed' ? 'border-red-200 bg-red-50/40' : 'border-gray-200'}`}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${t.cls}`}>{t.label}</span>
                      {b.status === 'failed' && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Failed</span>}
                      {b.status === 'running' && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Running…</span>}
                      <span className="text-sm font-semibold text-gray-800">{new Date(b.createdAt).toLocaleString()}</span>
                      <span className="text-xs text-gray-500">{timeAgo(b.createdAt)}</span>
                      {ok && <span className="text-xs text-gray-500">{b.tableCount} tables · {b.rowCount} rows · {fmtBytes(b.sizeBytes)}</span>}
                      {b.createdBy && <span className="text-xs text-gray-400">by {b.createdBy}</span>}
                    </div>
                    {b.note && <p className="text-xs text-gray-500 mt-1">{b.note}</p>}
                    {b.error && <p className="text-xs text-red-600 mt-1">{b.error}</p>}
                    {ok && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button onClick={() => restore(b)} disabled={working} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"><RotateCcw className="w-3.5 h-3.5" />Restore</button>
                        <button onClick={() => verify(b)} disabled={working} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60"><ShieldCheck className="w-3.5 h-3.5" />Verify</button>
                        <button onClick={() => download(b)} disabled={working} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-60"><Download className="w-3.5 h-3.5" />Download</button>
                        <button onClick={() => remove(b)} disabled={working} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                      </div>
                    )}
                    {!ok && b.status === 'failed' && (
                      <div className="mt-2"><button onClick={() => remove(b)} className="text-xs font-semibold text-red-600 hover:underline">Dismiss</button></div>
                    )}
                    {verifyResult?.id === b.id && (
                      <div className={`mt-2 rounded-lg border p-3 text-xs space-y-1 ${verifyResult.result.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <p className="font-bold">{verifyResult.result.ok ? '✓ Backup is intact and restorable' : '✗ Backup failed verification'}</p>
                        {verifyResult.result.checks.map((c: any, i: number) => (
                          <p key={i} className={c.ok ? 'text-green-800' : 'text-red-700'}>{c.ok ? '✓' : '✗'} {c.name}{c.detail ? ` — ${c.detail}` : ''}</p>
                        ))}
                        <button onClick={() => setVerifyResult(null)} className="underline text-gray-500">Close</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
          <p className="font-bold text-gray-700">How it works</p>
          <p>• Backups are consistent snapshots of every table, compressed and stored in the database so they survive redeploys.</p>
          <p>• Restore is all-or-nothing: if anything fails, your data is left exactly as it was. A safety snapshot is taken automatically before every restore and before “Clear Records”.</p>
          <p>• For disaster recovery, <strong>download</strong> backups regularly and keep a copy outside the server (or enable Railway’s own Postgres backups).</p>
        </div>
      </div>
    </div>
  );
}
