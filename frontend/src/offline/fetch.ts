/**
 * window.fetch replacement. Every /api call in the app (both `api.*` helpers and raw fetch()) flows through here.
 *
 *  GET   network first → copy good JSON to IndexedDB → if the network is down/slow, serve the saved copy.
 *  write matching QUEUE_RULES → try the network; if unreachable, save to the outbox and answer "202 queued"
 *        (with an optimistic record) so the screen behaves as if it saved. Uploaded automatically later.
 *  other writes / auth → untouched: they fail normally when offline.
 *
 * It also keeps the previous global interceptor's job: attach the JWT to API calls.
 */
import { isCacheableGet, makeTempId, matchQueueRule, TEMP_ID_RE, TIMEOUT } from './config';
import { loadCached, saveResponse, toResponse } from './cache';
import { API_ORIGIN, captureNativeFetch, fetchWithTimeout, isNetworkError, nativeFetch } from './net';
import { applyOptimistic } from './optimistic';
import { enqueue, flush, hasPendingFor } from './outbox';
import { getToken, getUserKey } from './session';
import { getState, setReachable } from './store';

const GATEWAY_DOWN = [502, 503, 504];

function describe(input: RequestInfo | URL, init?: RequestInit) {
  let href: string;
  let method = 'GET';
  if (typeof input === 'string') href = input;
  else if (input instanceof URL) href = input.href;
  else { href = input.url; method = input.method; }
  method = (init?.method || method).toUpperCase();
  let url: URL | null = null;
  try { url = new URL(href, window.location.href); } catch { /* not a URL */ }
  const sameOrigin = !!url && (url.origin === window.location.origin || (API_ORIGIN !== '' && url.origin === API_ORIGIN));
  const isApi = !!url && sameOrigin && url.pathname.startsWith('/api/');
  return { url, method, isApi, isRequestObject: typeof input !== 'string' && !(input instanceof URL) };
}

function withAuth(init: RequestInit | undefined): RequestInit {
  const headers = new Headers(init?.headers);
  const token = getToken();
  // Always override: some screens build the header from localStorage (empty) or a stale value; the live session token wins.
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

const offlineError = () => new TypeError('Failed to fetch (offline)');

async function handleGet(url: URL, init: RequestInit): Promise<Response> {
  const userKey = getUserKey();
  const cached = await loadCached(userKey, url);
  if (navigator.onLine === false) {
    if (cached) return toResponse(cached);
    throw offlineError();
  }
  try {
    // With a saved copy in hand, don't make the user wait on a bad connection.
    const res = await fetchWithTimeout(url.href, init, cached ? TIMEOUT.read : undefined);
    if (GATEWAY_DOWN.includes(res.status) && cached) { setReachable(false); return toResponse(cached); }
    if (!GATEWAY_DOWN.includes(res.status)) setReachable(true);
    if (res.status === 200) void saveResponse(userKey, url, res);
    return res;
  } catch (e) {
    if (isNetworkError(e)) {
      setReachable(false);
      if (cached) return toResponse(cached);
    }
    throw e;
  }
}

async function handleWrite(url: URL, method: string, init: RequestInit): Promise<Response> {
  const rule = matchQueueRule(method, url.pathname);
  const body = init.body;
  if (!rule || !(body == null || typeof body === 'string')) {
    // Not deferrable: behave exactly like a normal fetch (it will throw if offline).
    try { const res = await nativeFetch(url.href, init); if (!GATEWAY_DOWN.includes(res.status)) setReachable(true); return res; }
    catch (e) { if (isNetworkError(e)) setReachable(false); throw e; }
  }

  const bodyText = (body as string | null | undefined) ?? null;
  let parsed: any = {};
  try { parsed = bodyText ? JSON.parse(bodyText) : {}; } catch { /* leave {} */ }
  const path = url.pathname + url.search;
  const key = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);

  const queueIt = async (): Promise<Response> => {
    const tempId = rule.creates ? makeTempId() : undefined;
    let item;
    try {
      item = await enqueue({ id: key, method, url: path, body: bodyText, kind: rule.kind, label: rule.label(parsed), tempId });
    } catch {
      throw offlineError(); // couldn't store it durably → don't claim it was saved
    }
    const payload = await applyOptimistic({ kind: rule.kind, method, pathname: url.pathname, body: parsed, tempId: item.tempId, userKey: item.userKey });
    if (getState().online) void flush();
    return new Response(JSON.stringify(payload), {
      status: 202,
      headers: { 'Content-Type': 'application/json', 'X-NASaAlaga-Queued': '1' },
    });
  };

  // Keep order: if anything is already waiting (or this write points at a not-yet-uploaded record), queue behind it.
  const refsTemp = TEMP_ID_RE.test(path + (bodyText ?? ''));
  if (refsTemp || getState().pending > 0 || (await hasPendingFor())) return queueIt();
  if (navigator.onLine === false) return queueIt();

  const headers = new Headers(init.headers);
  headers.set('Idempotency-Key', key); // if the response is lost mid-flight and we queue+replay, the server dedupes
  try {
    const res = await fetchWithTimeout(url.href, { ...init, headers }, getState().online ? TIMEOUT.mutation : TIMEOUT.mutationDegraded);
    if (GATEWAY_DOWN.includes(res.status)) { setReachable(false); return queueIt(); }
    setReachable(true);
    return res;
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    setReachable(false);
    return queueIt();
  }
}

async function offlineFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const d = describe(input, init);
  if (!d.isApi || !d.url) return nativeFetch(input, init);
  // A Request object carries its own body stream; leave those untouched (the app doesn't use them for /api).
  if (d.isRequestObject) return nativeFetch(input, init);

  const authed = withAuth(init);
  const { url, method } = d;

  if (method === 'GET' && isCacheableGet(url.pathname)) return handleGet(url, authed);
  if (method === 'GET') {
    // Uncached GETs: health/system checks must not hang the splash screen on a bad connection.
    const quick = url.pathname === '/api/health' || url.pathname.startsWith('/api/system/');
    return fetchWithTimeout(url.href, authed, quick ? TIMEOUT.init : undefined);
  }
  if (method === 'HEAD' || method === 'OPTIONS') return nativeFetch(url.href, authed);
  return handleWrite(url, method, authed);
}

export function installOfflineFetch() {
  const w = window as any;
  if (w.__nasaalagaOfflineFetch) return;
  w.__nasaalagaOfflineFetch = true;
  captureNativeFetch();
  window.fetch = offlineFetch as typeof fetch;
}

/** Test hook. */
export const _offlineFetch = offlineFetch;
