/**
 * Read-through cache for API GETs, stored in IndexedDB and scoped per account.
 * Network first; when the network is down (or slow) the last good copy is served instead.
 * Also lets us show records saved offline immediately (optimistic patches) before they've been uploaded.
 */
import { CACHE_MAX_AGE_MS, CACHE_MAX_ENTRY_CHARS, isCacheableGet } from './config';
import { dbClear, dbDelete, dbEntries, dbGet, dbPut } from './db';

export interface CachedResponse {
  userKey: string;
  path: string;      // pathname + search
  pathname: string;
  search: string;
  status: number;
  contentType: string;
  body: string;
  cachedAt: number;
}

const keyOf = (userKey: string, path: string) => `${userKey}|${path}`;

export async function saveResponse(userKey: string, url: URL, res: Response): Promise<void> {
  try {
    if (res.status !== 200 || !isCacheableGet(url.pathname)) return;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) return;
    const body = await res.clone().text();
    if (body.length > CACHE_MAX_ENTRY_CHARS) return;
    const path = url.pathname + url.search;
    const entry: CachedResponse = { userKey, path, pathname: url.pathname, search: url.search, status: 200, contentType: ct, body, cachedAt: Date.now() };
    await dbPut('responses', keyOf(userKey, path), entry);
  } catch { /* caching is best-effort */ }
}

export async function loadCached(userKey: string, url: URL): Promise<CachedResponse | null> {
  try { return (await dbGet<CachedResponse>('responses', keyOf(userKey, url.pathname + url.search))) ?? null; }
  catch { return null; }
}

export function toResponse(c: CachedResponse): Response {
  return new Response(c.body, {
    status: 200,
    headers: {
      'Content-Type': c.contentType || 'application/json',
      'X-NASaAlaga-Offline': 'cache',
      'X-NASaAlaga-Cached-At': String(c.cachedAt),
    },
  });
}

/**
 * Apply `mutate` to every cached JSON body for `pathname` (all query variants) belonging to `userKey`.
 * `mutate` edits the parsed body in place; it receives the query string so it can skip filtered lists.
 */
export async function patchCached(userKey: string, pathname: string, mutate: (json: any, search: string) => void): Promise<void> {
  try {
    for (const [k, v] of await dbEntries<CachedResponse>('responses')) {
      if (v.userKey !== userKey || v.pathname !== pathname) continue;
      try {
        const json = JSON.parse(v.body);
        mutate(json, v.search);
        await dbPut('responses', k, { ...v, body: JSON.stringify(json) });
      } catch { /* skip unparsable entry */ }
    }
  } catch { /* ignore */ }
}

/** Remove a provisional record (by id) from every cached list once the real one has been uploaded. */
export async function dropTempRecord(tempId: string): Promise<void> {
  try {
    for (const [k, v] of await dbEntries<CachedResponse>('responses')) {
      if (!v.body.includes(tempId)) continue;
      try {
        const json = JSON.parse(v.body);
        let touched = false;
        const walk = (node: any) => {
          if (Array.isArray(node)) {
            for (let i = node.length - 1; i >= 0; i--) {
              if (node[i] && typeof node[i] === 'object' && !Array.isArray(node[i]) && node[i].id === tempId) { node.splice(i, 1); touched = true; }
              else walk(node[i]);
            }
          } else if (node && typeof node === 'object') Object.values(node).forEach(walk);
        };
        walk(json);
        if (touched) await dbPut('responses', k, { ...v, body: JSON.stringify(json) });
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }
}

export async function pruneCache(): Promise<void> {
  try {
    const cutoff = Date.now() - CACHE_MAX_AGE_MS;
    for (const [k, v] of await dbEntries<CachedResponse>('responses')) if (v.cachedAt < cutoff) await dbDelete('responses', k);
  } catch { /* ignore */ }
}

export const clearCache = () => dbClear('responses').catch(() => {});
