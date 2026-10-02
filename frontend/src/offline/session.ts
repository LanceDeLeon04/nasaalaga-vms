/**
 * Session helpers for offline use.
 *
 * The app keeps its session in sessionStorage, which is wiped when the installed app/tab is closed —
 * so a field worker who closes the app in a no-signal area couldn't get back in. We therefore mirror the
 * session to localStorage (capped by the JWT's own expiry and OFFLINE_SESSION_TTL_MS) and offer an explicit
 * "Resume offline session" button on the login screen — only while the device is offline.
 *
 *  • Idle time-out keeps the mirror (so staff aren't locked out mid-shift without signal).
 *  • Explicit logout wipes the mirror AND every cached response on the device.
 *  • The upload queue survives both, and is only ever uploaded under the account that created it.
 */
import { OFFLINE_SESSION_TTL_MS } from './config';
import { dbClear, dbDelete, dbEntries } from './db';

const USER_KEY = 'nasaalaga_user';
const TOKEN_KEY = 'nasaalaga_token';
const MIRROR_KEY = 'nasaalaga_offline_session';
export const SESSION_EVENT = 'nasaalaga:session';

interface Mirror { user: any; token: string; savedAt: number; expiresAt: number }

const ss = () => { try { return window.sessionStorage; } catch { return null; } };
const ls = () => { try { return window.localStorage; } catch { return null; } };

export function getToken(): string | null {
  const t = ss()?.getItem(TOKEN_KEY) ?? null;
  return t && t.length <= 6144 ? t : null;
}

export function getStoredUser(): any | null {
  try { return JSON.parse(ss()?.getItem(USER_KEY) || 'null'); } catch { return null; }
}

/** Stable per-account key used to scope cached data and queued uploads. 'anon' = not signed in / guest. */
export function getUserKey(): string {
  const u = getStoredUser();
  if (!u || !getToken()) return 'anon';
  return 'u:' + String(u.id ?? u.email ?? u.username ?? 'unknown');
}

function jwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(payload + '='.repeat((4 - (payload.length % 4)) % 4)));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch { return null; }
}

function readMirror(): Mirror | null {
  try {
    const m = JSON.parse(ls()?.getItem(MIRROR_KEY) || 'null') as Mirror | null;
    if (!m || !m.token || !m.user || !(m.expiresAt > Date.now())) return null;
    return m;
  } catch { return null; }
}

function mirrorSession() {
  const token = getToken();
  const user = getStoredUser();
  if (!token || !user) return;
  const now = Date.now();
  const exp = jwtExpiryMs(token);
  const expiresAt = Math.min(now + OFFLINE_SESSION_TTL_MS, exp ?? Infinity);
  try { ls()?.setItem(MIRROR_KEY, JSON.stringify({ user, token, savedAt: now, expiresAt } satisfies Mirror)); } catch { /* quota */ }
  // A different account signed in on this device → its predecessor's cached data must not linger.
  void purgeOtherUsers(getUserKey());
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** Patch sessionStorage.setItem so login (which writes user+token) refreshes the mirror without touching Login.tsx flows. */
export function installSessionMirror() {
  const w = window as any;
  if (w.__nasaalagaSessionMirror) return;
  w.__nasaalagaSessionMirror = true;
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    orig.call(this, key, value);
    if (this === ss() && (key === USER_KEY || key === TOKEN_KEY)) queueMicrotask(mirrorSession);
  };
  mirrorSession(); // e.g. after a page reload while signed in
}

export interface OfflineSessionInfo { username: string; role: string; expiresAt: number }

export function getOfflineSessionInfo(): OfflineSessionInfo | null {
  const m = readMirror();
  return m ? { username: String(m.user.username ?? m.user.email ?? 'user'), role: String(m.user.role ?? ''), expiresAt: m.expiresAt } : null;
}

/** Put the mirrored session back into sessionStorage. Returns false if none/expired. */
export function restoreOfflineSession(): boolean {
  const m = readMirror();
  const store = ss();
  if (!m || !store) return false;
  store.setItem(USER_KEY, JSON.stringify(m.user));
  store.setItem(TOKEN_KEY, m.token);
  return true;
}

/**
 * End the session.
 *  keepOffline=true  → idle time-out: keep the offline copy so the user can resume without signal.
 *  keepOffline=false → explicit logout: wipe the offline copy and all cached data from this device.
 * The upload queue is never touched.
 */
export async function endSession(opts: { keepOffline: boolean }) {
  const store = ss();
  store?.removeItem(USER_KEY);
  store?.removeItem(TOKEN_KEY);
  store?.removeItem('nasaalaga_privacy_ack'); // next sign-in shows the Data Privacy Notice again
  if (!opts.keepOffline) {
    try { ls()?.removeItem(MIRROR_KEY); } catch { /* ignore */ }
    try { await dbClear('responses'); } catch { /* ignore */ }
  }
}

async function purgeOtherUsers(keep: string) {
  try {
    for (const [k, v] of await dbEntries<{ userKey?: string }>('responses')) {
      if (v.userKey && v.userKey !== keep && v.userKey !== 'anon') await dbDelete('responses', k);
    }
  } catch { /* ignore */ }
}
