/**
 * Upload queue ("outbox") for writes made while offline, plus the auto-sync engine.
 *
 * Guarantees:
 *  • Durable — items live in IndexedDB and survive closing the app.
 *  • In order — items upload oldest-first, one at a time (a queued edit never overtakes an earlier one).
 *  • Exactly once — every item carries an Idempotency-Key the server de-duplicates on, so a request whose
 *    response was lost is never applied twice.
 *  • Account-safe — an item is only uploaded under the account that created it.
 *  • Nothing silently dropped — server rejections (validation, duplicate tag …) stay in the queue as
 *    "failed" with the server's message until the user retries or discards them.
 */
import { TIMEOUT } from './config';
import { dbAvailable, dbDelete, dbEntries, dbGet, dbPut } from './db';
import { dropTempRecord } from './cache';
import { extractRealId } from './optimistic';
import { API_ORIGIN, fetchWithTimeout, isNetworkError } from './net';
import { getToken, getUserKey, SESSION_EVENT } from './session';
import { getState, isReachable, setBrowserOnline, setReachable, setState, type OutboxItem } from './store';

export const SYNCED_EVENT = 'nasaalaga:synced';
/** Strictly increasing timestamps so two writes in the same millisecond still keep their order. */
let lastStamp = 0;
const stamp = () => (lastStamp = Math.max(Date.now(), lastStamp + 1));
const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

let bc: BroadcastChannel | null | undefined;
function channel(): BroadcastChannel | null {
  if (bc === undefined) { try { bc = new BroadcastChannel('nasaalaga-outbox'); } catch { bc = null; } }
  return bc;
}
/** Tell other tabs the queue changed (BroadcastChannel never echoes to the sender). */
function broadcast() { try { channel()?.postMessage('changed'); } catch { /* ignore */ } }

/* ── queue access ─────────────────────────────────────────────────────────── */

async function allItems(): Promise<OutboxItem[]> {
  try { return (await dbEntries<OutboxItem>('outbox')).map(e => e[1]).sort((a, b) => a.createdAt - b.createdAt); }
  catch { return []; }
}

export async function refreshState() {
  const mine = (await allItems()).filter(i => i.userKey === getUserKey());
  setState({
    items: mine,
    pending: mine.filter(i => i.status === 'pending').length,
    failed: mine.filter(i => i.status === 'failed').length,
  });
}

/** Queue a write. Rejects if it can't be stored durably (caller then surfaces the original error). */
export async function enqueue(p: { method: string; url: string; body: string | null; kind: string; label: string; tempId?: string; id?: string }): Promise<OutboxItem> {
  if (!(await dbAvailable())) throw new Error('Offline storage unavailable');
  const item: OutboxItem = {
    id: p.id ?? newKey(), userKey: getUserKey(), method: p.method, url: p.url, body: p.body,
    kind: p.kind, label: p.label, tempId: p.tempId, createdAt: stamp(), attempts: 0, status: 'pending',
  };
  await dbPut('outbox', item.id, item);
  await refreshState();
  broadcast();
  return item;
}

export async function hasPendingFor(userKey = getUserKey()): Promise<boolean> {
  return (await allItems()).some(i => i.userKey === userKey && i.status === 'pending');
}

export async function retryItem(id: string) {
  const it = await dbGet<OutboxItem>('outbox', id);
  if (!it) return;
  // New key: a manual retry is a fresh attempt, not a replay of a request the server already rejected.
  const fresh = newKey();
  await dbDelete('outbox', id);
  await dbPut('outbox', fresh, { ...it, id: fresh, status: 'pending', error: undefined, attempts: 0 });
  await refreshState();
  broadcast();
  void flush();
}

export async function retryAllFailed() {
  for (const it of getState().items.filter(i => i.status === 'failed')) await retryItem(it.id);
}

export async function discardItem(id: string) {
  const it = await dbGet<OutboxItem>('outbox', id);
  await dbDelete('outbox', id);
  if (it?.tempId) void dropTempRecord(it.tempId);
  await refreshState();
  broadcast();
}

/** JSON of failed items, so nothing has to be lost when a record can't be uploaded. */
export function exportFailed(): string {
  return JSON.stringify(getState().items.filter(i => i.status === 'failed').map(i => ({
    label: i.label, method: i.method, url: i.url, error: i.error, queuedAt: new Date(i.createdAt).toISOString(),
    body: (() => { try { return JSON.parse(i.body || 'null'); } catch { return i.body; } })(),
  })), null, 2);
}

/* ── upload ───────────────────────────────────────────────────────────────── */

type Outcome =
  | { kind: 'ok'; json: any }
  | { kind: 'retry'; network: boolean; status?: number }
  | { kind: 'auth' }
  | { kind: 'rejected'; message: string };

async function send(item: OutboxItem, token: string | null): Promise<Outcome> {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Idempotency-Key': item.id });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetchWithTimeout(API_ORIGIN + item.url, { method: item.method, headers, body: item.body ?? undefined }, TIMEOUT.flush);
  } catch (e) {
    if (isNetworkError(e)) return { kind: 'retry', network: true };
    throw e;
  }
  if (res.ok) return { kind: 'ok', json: await res.json().catch(() => null) };
  if (res.status === 401) return { kind: 'auth' };
  // 502/503/504 = server/proxy restarting → keep waiting. Other transient codes get a limited number of tries.
  if ([408, 425, 429, 500, 502, 503, 504].includes(res.status)) return { kind: 'retry', network: res.status >= 502, status: res.status };
  const j = await res.json().catch(() => null);
  return { kind: 'rejected', message: (j && (j.error || j.message)) || `Server rejected the request (HTTP ${res.status})` };
}

const referencesTemp = (it: OutboxItem, temp: string) => it.url.includes(temp) || (it.body ?? '').includes(temp);

const MAX_SERVER_ERROR_ATTEMPTS = 5;
let flushing = false;

/** Later queued items that point at a record which failed to upload can't succeed either — park them too. */
async function failDependents(queue: OutboxItem[], idx: number, failed: OutboxItem, reason: string) {
  if (!failed.tempId) return;
  for (let j = idx + 1; j < queue.length; j++) {
    const later = queue[j];
    if (later.status === 'pending' && referencesTemp(later, failed.tempId)) {
      const blocked: OutboxItem = { ...later, status: 'failed', error: `Depends on “${failed.label}”, which could not be uploaded: ${reason}` };
      queue[j] = blocked;
      await dbPut('outbox', blocked.id, blocked);
    }
  }
}

async function flushLocked(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  setState({ syncing: true });
  let synced = 0;
  try {
    const userKey = getUserKey();
    const token = getToken();
    let queue = (await allItems()).filter(i => i.userKey === userKey && i.status === 'pending');
    if (!queue.length) { setState({ needsLogin: false }); return 0; }

    for (let idx = 0; idx < queue.length; idx++) {
      const item = queue[idx];
      if (item.status !== 'pending') continue; // parked as failed because an earlier item it depends on failed
      const out = await send(item, token);

      if (out.kind === 'ok') {
        setReachable(true);
        setState({ needsLogin: false });
        await dbDelete('outbox', item.id);
        synced++;
        if (item.tempId) {
          const real = extractRealId(out.json);
          if (real) {
            // Later queued items may point at the provisional id (e.g. a vaccination for a pet registered offline).
            for (let j = idx + 1; j < queue.length; j++) {
              const later = queue[j];
              if (!referencesTemp(later, item.tempId)) continue;
              const upd: OutboxItem = { ...later, url: later.url.split(item.tempId).join(real), body: later.body ? later.body.split(item.tempId).join(real) : later.body };
              queue[j] = upd;
              await dbPut('outbox', upd.id, upd);
            }
          }
          void dropTempRecord(item.tempId);
        }
        continue;
      }

      const now = Date.now();
      if (out.kind === 'retry') {
        if (out.network) setReachable(false);
        const attempts = item.attempts + 1;
        if (!out.network && attempts >= MAX_SERVER_ERROR_ATTEMPTS) {
          // A request the server keeps failing (HTTP 500 …) must not block every record queued behind it.
          const msg = `Server error (HTTP ${out.status}) after ${attempts} attempts`;
          await dbPut('outbox', item.id, { ...item, status: 'failed', error: msg, attempts, lastAttemptAt: now });
          await failDependents(queue, idx, item, msg);
          continue;
        }
        await dbPut('outbox', item.id, { ...item, attempts, lastAttemptAt: now });
        break; // keep order: don't try later items ahead of this one
      }
      if (out.kind === 'auth') {
        setState({ needsLogin: true });
        break;
      }
      // Rejected by the server → park it as failed (kept, visible) and carry on with independent items.
      await dbPut('outbox', item.id, { ...item, status: 'failed', error: out.message, attempts: item.attempts + 1, lastAttemptAt: now });
      await failDependents(queue, idx, item, out.message);
    }
  } finally {
    flushing = false;
    setState({ syncing: false });
    await refreshState();
  }
  if (synced > 0) {
    setState({ syncEpoch: getState().syncEpoch + 1, lastSyncCount: synced });
    window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: { count: synced } }));
  }
  if (synced > 0) broadcast();
  return synced;
}

/** Upload everything queued for the signed-in account. Safe to call any time / from several tabs. */
export async function flush(): Promise<number> {
  if (!getState().pending && !(await hasPendingFor())) return 0;
  const locks = (navigator as any).locks;
  if (locks?.request) {
    return locks.request('nasaalaga-outbox-flush', { ifAvailable: true }, async (lock: unknown) => (lock ? flushLocked() : 0));
  }
  return flushLocked();
}

/* ── connectivity + auto-sync ─────────────────────────────────────────────── */

export async function probe(): Promise<boolean> {
  if (navigator.onLine === false) { setReachable(false); return false; }
  try {
    const res = await fetchWithTimeout(API_ORIGIN + '/api/health', { cache: 'no-store' }, TIMEOUT.probe);
    const up = ![502, 503, 504].includes(res.status); // any real answer from our server counts as reachable
    setReachable(up);
    return up;
  } catch {
    setReachable(false);
    return false;
  }
}

async function probeAndFlush() {
  if (await probe()) await flush();
}

let started = false;
export function startAutoSync() {
  if (started) return;
  started = true;
  void refreshState().then(() => void probeAndFlush()); // also detects "connected to Wi-Fi but no internet" at startup

  window.addEventListener('online', () => { setBrowserOnline(true); void probeAndFlush(); });
  window.addEventListener('offline', () => setBrowserOnline(false));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void probeAndFlush(); });
  window.addEventListener(SESSION_EVENT, () => { void refreshState().then(() => flush()); });
  setInterval(() => {
    const s = getState();
    if (s.pending > 0 || !s.online || !isReachable()) void probeAndFlush();
  }, 20_000);
  // Learn about queue changes made by other tabs.
  if (channel()) channel()!.onmessage = () => void refreshState();
}
