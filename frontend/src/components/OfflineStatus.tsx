import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CloudUpload, Download, RefreshCw, Trash2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { discardItem, exportFailed, flush, retryAllFailed, retryItem, useOffline } from '../offline';

const ago = (t: number) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

/**
 * Floating status pill (top-centre). Hidden while everything is online and synced.
 * Shows offline state, how many records are waiting to upload, and lets staff review / retry / export
 * anything the server rejected. Uploading itself is automatic — see src/offline/outbox.ts.
 */
export default function OfflineStatus() {
  const s = useOffline();
  const [open, setOpen] = useState(false);

  // "Back online" toast (only after a meaningful outage, to avoid flapping on a weak signal).
  const wentOfflineAt = useRef<number | null>(s.online ? null : Date.now());
  useEffect(() => {
    if (!s.online) { if (wentOfflineAt.current === null) wentOfflineAt.current = Date.now(); return; }
    if (wentOfflineAt.current !== null && Date.now() - wentOfflineAt.current > 5000) toast.success('Back online');
    wentOfflineAt.current = null;
  }, [s.online]);

  // Uploaded-records toast.
  const lastEpoch = useRef(s.syncEpoch);
  useEffect(() => {
    if (s.syncEpoch === lastEpoch.current) return;
    lastEpoch.current = s.syncEpoch;
    toast.success(`${s.lastSyncCount} offline record${s.lastSyncCount === 1 ? '' : 's'} uploaded`, {
      duration: 10000,
      action: { label: 'Refresh', onClick: () => window.location.reload() },
    });
  }, [s.syncEpoch, s.lastSyncCount]);

  // Nothing to say → stay out of the way.
  useEffect(() => { if (s.online && !s.pending && !s.failed) setOpen(false); }, [s.online, s.pending, s.failed]);
  if (s.online && !s.pending && !s.failed && !s.needsLogin) return null;

  const tone = s.failed > 0 ? 'red' : !s.online ? 'amber' : 'blue';
  const toneCls = {
    red: 'bg-red-600 text-white',
    amber: 'bg-amber-500 text-white',
    blue: 'bg-blue-600 text-white',
  }[tone];

  let text: string;
  if (!s.online) text = s.pending ? `Offline · ${s.pending} saved on this device` : 'Offline · showing saved data';
  else if (s.needsLogin) text = `${s.pending} waiting · sign in again to upload`;
  else if (s.syncing) text = `Uploading ${s.pending}…`;
  else if (s.pending) text = `${s.pending} waiting to upload`;
  else text = `${s.failed} upload${s.failed === 1 ? '' : 's'} need attention`;
  if (s.online && s.failed && s.pending && !s.needsLogin && !s.syncing) text += ` · ${s.failed} need attention`;

  const Icon = s.failed > 0 ? AlertTriangle : !s.online ? WifiOff : s.syncing ? RefreshCw : CloudUpload;

  const download = () => {
    const blob = new Blob([exportFailed()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nasaalaga-failed-uploads-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div
      className="fixed left-1/2 z-[9998] -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${toneCls}`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${s.syncing && s.online ? 'animate-spin' : ''}`} />
        <span className="truncate">{text}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-3 text-gray-800 shadow-xl">
          <p className="mb-2 text-xs text-gray-500">
            {s.online
              ? 'Records saved while offline upload automatically. You can keep working.'
              : 'You are offline. Everything you save is kept on this device and uploads automatically when the connection returns — keep this app installed/open on this device until it does.'}
          </p>

          {s.items.length === 0 ? (
            <p className="py-2 text-sm text-gray-500">Nothing waiting.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {s.items.map(it => (
                <li key={it.id} className={`rounded-xl border p-2 text-sm ${it.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-snug">{it.label}</span>
                    <span className="shrink-0 text-xs text-gray-400">{ago(it.createdAt)}</span>
                  </div>
                  {it.status === 'failed' ? (
                    <>
                      <p className="mt-1 text-xs text-red-700">{it.error || 'Could not be uploaded.'}</p>
                      <div className="mt-2 flex gap-2">
                        <button className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200" onClick={() => retryItem(it.id)}>Retry</button>
                        <button className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200"
                          onClick={() => { if (window.confirm('Discard this record? It has not been saved on the server.')) discardItem(it.id); }}>
                          <Trash2 className="h-3 w-3" /> Discard
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      {it.attempts > 0 ? `Waiting to upload · tried ${it.attempts}×` : 'Waiting to upload'}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={!s.online || s.syncing || !s.pending}
              onClick={() => flush()}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              <RefreshCw className="h-3 w-3" /> Upload now
            </button>
            {s.failed > 0 && (
              <>
                <button onClick={() => retryAllFailed()} disabled={!s.online} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 disabled:opacity-40">Retry failed</button>
                <button onClick={download} className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-300">
                  <Download className="h-3 w-3" /> Export failed
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
