/** Tiny observable store holding what the UI needs to show about connectivity and the upload queue. */
export type OutboxStatus = 'pending' | 'failed';

export interface OutboxItem {
  /** Also sent as the Idempotency-Key so the server can never apply the same write twice. */
  id: string;
  userKey: string;
  method: string;
  /** Path + query only (e.g. /api/pets); the API origin is added at upload time. */
  url: string;
  body: string | null;
  kind: string;
  label: string;
  /** Provisional id handed to the UI; replaced by the server's id after upload. */
  tempId?: string;
  createdAt: number;
  attempts: number;
  status: OutboxStatus;
  error?: string;
  lastAttemptAt?: number;
}

export interface OfflineState {
  /** Best current belief: browser says online AND the server was reachable last time we tried. */
  online: boolean;
  syncing: boolean;
  pending: number;
  failed: number;
  /** Uploads are waiting because the session expired / the user must sign in again. */
  needsLogin: boolean;
  /** Current user's queue, oldest first. */
  items: OutboxItem[];
  /** Bumps every time a batch of uploads completes (drives the "N synced" toast). */
  syncEpoch: number;
  lastSyncCount: number;
}

let reachable = true; // last network attempt succeeded?
let state: OfflineState = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  syncing: false, pending: 0, failed: 0, needsLogin: false, items: [], syncEpoch: 0, lastSyncCount: 0,
};
const listeners = new Set<() => void>();

export const getState = () => state;
export const isReachable = () => reachable;

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function setState(patch: Partial<OfflineState>) {
  const next = { ...state, ...patch };
  const changed = (Object.keys(next) as Array<keyof OfflineState>).some(k => next[k] !== state[k]);
  if (!changed) return;
  state = next;
  listeners.forEach(l => l());
}

/** Record the outcome of any real network attempt. */
export function setReachable(ok: boolean) {
  reachable = ok;
  const browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  setState({ online: ok && browserOnline });
}

export function setBrowserOnline(on: boolean) {
  setState({ online: on && reachable });
}
