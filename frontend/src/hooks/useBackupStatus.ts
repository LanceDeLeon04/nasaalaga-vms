import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export type BackupHealth = 'healthy' | 'stale' | 'failing' | 'never' | 'disabled';
export interface BackupStatus {
  health: BackupHealth;
  autoBackup: boolean;
  frequency: string;
  retention: number;
  lastBackup: { id: string; createdAt: string; type: string } | null;
  lastError: string | null;
  nextDue: string | null;
}

/** Live backup health for the header / sidebar badges. Only fetches for admin roles; refreshes every 2 min. */
export function useBackupStatus(role: string | null | undefined): BackupStatus | null {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const allowed = role === 'admin' || role === 'superadmin';

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const load = () => api.getBackupStatus().then(r => { if (!cancelled) setStatus(r.status); }).catch(() => {});
    load();
    const t = setInterval(load, 2 * 60 * 1000);
    const onChange = () => load();
    window.addEventListener('nasaalaga_backup_changed', onChange);
    return () => { cancelled = true; clearInterval(t); window.removeEventListener('nasaalaga_backup_changed', onChange); };
  }, [allowed]);

  return allowed ? status : null;
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return 'never';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const HEALTH_LABEL: Record<BackupHealth, string> = {
  healthy: 'Active', stale: 'Overdue', failing: 'Failing', never: 'No backup yet', disabled: 'Disabled',
};
export const HEALTH_COLOR: Record<BackupHealth, string> = {
  healthy: 'text-green-300', stale: 'text-amber-300', failing: 'text-red-300', never: 'text-amber-300', disabled: 'text-gray-300',
};
export const HEALTH_DOT: Record<BackupHealth, string> = {
  healthy: 'bg-green-300', stale: 'bg-amber-300', failing: 'bg-red-400', never: 'bg-amber-300', disabled: 'bg-gray-400',
};
