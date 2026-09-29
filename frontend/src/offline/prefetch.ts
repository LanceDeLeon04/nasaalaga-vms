/**
 * Warm the offline cache right after sign-in (and at most every 30 min), so a field worker who signed in
 * with signal already has the lists the registration / vaccination screens need — even for modules they
 * haven't opened yet. Uses the intercepted window.fetch, so responses land in the per-user IndexedDB cache.
 */
import { getStoredUser, getToken, getUserKey, SESSION_EVENT } from './session';
import { getState } from './store';

const STAFF_ROLES = new Set(['bahw', 'admin', 'superadmin', 'cvoStaff']);
const ENDPOINTS = [
  '/api/barangays',
  '/api/pets',
  '/api/livestock',
  '/api/livestock/summary',
  '/api/livestock/mortality/all',
  '/api/livestock/disease-events/all',
  '/api/pet-deaths/all',
  '/api/schedules',
  '/api/appointment-schedules',
  '/api/inventory/medicines',
  '/api/dashboard/summary',
];
const EVERY_MS = 30 * 60 * 1000;
const stampKey = () => `nasaalaga_prefetch_at:${getUserKey()}`;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let running = false;

export async function prefetchForOffline(force = false): Promise<void> {
  const user = getStoredUser();
  if (running || !user || !getToken() || !STAFF_ROLES.has(user.role) || !getState().online) return;
  try {
    const last = Number(localStorage.getItem(stampKey()) || 0);
    if (!force && Date.now() - last < EVERY_MS) return;
    localStorage.setItem(stampKey(), String(Date.now()));
  } catch { /* storage blocked → just run */ }

  running = true;
  try {
    for (const path of ENDPOINTS) {
      if (!getState().online) break;
      try { await (await fetch(path)).arrayBuffer(); } catch { /* offline / not permitted for this role — fine */ }
      await sleep(150); // be gentle on the server and the user's data plan
    }
  } finally { running = false; }
}

export function startPrefetch() {
  setTimeout(() => void prefetchForOffline(), 3000);
  window.addEventListener(SESSION_EVENT, () => setTimeout(() => void prefetchForOffline(true), 1500));
  window.addEventListener('online', () => setTimeout(() => void prefetchForOffline(), 5000));
}
