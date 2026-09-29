/**
 * Offline-mode configuration — single place to tune what works without a connection.
 *
 * How it works (see README → "Offline mode"):
 *   • The app shell (JS/CSS/HTML/icons) is precached by the service worker (vite.config.ts).
 *   • Successful API GETs are copied into IndexedDB and served back when the network is down.
 *   • Data-entry writes listed in QUEUE_RULES are saved to an IndexedDB outbox while offline and
 *     uploaded automatically (in order, exactly once) when the connection returns.
 *   • Everything else (login, admin, finance, deletes, approvals …) still needs a connection.
 */

/** How long an offline session (for "Resume offline session") stays valid. Also capped by the JWT's own expiry. */
export const OFFLINE_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Cached GET responses older than this are pruned at startup. */
export const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Don't cache a single response bigger than this (characters). */
export const CACHE_MAX_ENTRY_CHARS = 20_000_000;

export const TIMEOUT = {
  /** First attempt of a queueable write while we believe we're online. */
  mutation: 20_000,
  /** First attempt when the last request already failed (don't make the user wait). */
  mutationDegraded: 6_000,
  /** Uploading a queued item (may carry a base64 photo). */
  flush: 60_000,
  /** Reading data when we already hold a cached copy: give up on the network and use the copy. */
  read: 10_000,
  /** Reachability probe (/api/health). */
  probe: 5_000,
  /** App-start checks (/api/health, /api/system/*) so the splash never hangs on bad signal. */
  init: 4_000,
} as const;

export type QueueKind =
  | 'pet-create' | 'pet-update' | 'livestock-create' | 'livestock-update'
  | 'vaccination' | 'generic';

export interface QueueRule {
  method: 'POST' | 'PUT';
  /** Matched against the URL pathname, e.g. /api/pets/PET-1 */
  pattern: RegExp;
  kind: QueueKind;
  /** Gets a provisional id (OFFLINE-XXXXXXXX) that is swapped for the real one after upload. */
  creates?: boolean;
  label: (body: any) => string;
}

const s = (v: unknown, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

/**
 * Field-data-entry writes that are safe to defer. Deliberately NOT queued: auth/OTP, users, backup,
 * super-admin actions, inventory & budget (stock/finance must be live), deletes, and validation/approval
 * decisions. Those fail with a clear "needs a connection" message instead.
 */
export const QUEUE_RULES: QueueRule[] = [
  { method: 'POST', pattern: /^\/api\/pets$/, kind: 'pet-create', creates: true,
    label: b => `Register pet: ${s(b?.petName, 'unnamed')} (${s(b?.ownerName, 'owner n/a')})` },
  { method: 'PUT', pattern: /^\/api\/pets\/(?!pre-regist)[^/]+$/, kind: 'pet-update',
    label: b => `Update pet record${b?.petName ? ': ' + s(b.petName) : ''}` },
  { method: 'POST', pattern: /^\/api\/pets\/[^/]+\/old-records$/, kind: 'generic',
    label: () => 'Add old pet record' },

  { method: 'POST', pattern: /^\/api\/livestock$/, kind: 'livestock-create', creates: true,
    label: b => `Register livestock: ${s(b?.animalType, 'animal')} (${s(b?.ownerName, 'owner n/a')})` },
  { method: 'PUT', pattern: /^\/api\/livestock\/(?!mortality|disease-events)[^/]+$/, kind: 'livestock-update',
    label: b => `Update livestock record${b?.animalType ? ': ' + s(b.animalType) : ''}` },
  { method: 'POST', pattern: /^\/api\/livestock\/(?!mortality|disease-events)[^/]+\/health-records$/, kind: 'generic', creates: true,
    label: b => `Livestock health record${b?.recordType ? ': ' + s(b.recordType) : ''}` },
  { method: 'POST', pattern: /^\/api\/livestock\/mortality$/, kind: 'generic', creates: true,
    label: b => `Livestock death report: ${s(b?.animalType, 'animal')} — ${s(b?.barangay, 'barangay n/a')}` },
  { method: 'POST', pattern: /^\/api\/livestock\/disease-events$/, kind: 'generic', creates: true,
    label: b => `Disease event${b?.disease ? ': ' + s(b.disease) : ''}` },

  { method: 'POST', pattern: /^\/api\/pet-deaths$/, kind: 'generic', creates: true,
    label: b => `Pet death report${b?.petName ? ': ' + s(b.petName) : ''}` },
  { method: 'POST', pattern: /^\/api\/vaccination-history$/, kind: 'vaccination', creates: true,
    label: b => `Vaccination record${b?.vaccineName ? ': ' + s(b.vaccineName) : ''}` },
];

export function matchQueueRule(method: string, pathname: string): QueueRule | null {
  const m = method.toUpperCase();
  for (const r of QUEUE_RULES) if (r.method === m && r.pattern.test(pathname)) return r;
  return null;
}

/** GETs that must never be copied to the device (credentials, admin/PII listings, live status). */
export const NO_CACHE_GET: RegExp[] = [
  /^\/api\/auth\//,
  /^\/api\/health/,
  /^\/api\/system\//,
  /^\/api\/backup/,
  /^\/api\/users/,
  /^\/api\/audit-logs/,
  /^\/api\/superadmin/,
  /^\/api\/profile\//,
  /^\/api\/ai\//,
];

export const isCacheableGet = (pathname: string) => !NO_CACHE_GET.some(re => re.test(pathname));

/** Provisional ids created offline look like OFFLINE-1A2B3C4D. */
export const TEMP_ID_RE = /OFFLINE-[0-9A-F]{8}/;
export const makeTempId = () =>
  'OFFLINE-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
