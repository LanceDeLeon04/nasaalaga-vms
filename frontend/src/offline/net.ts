/** The browser's real fetch, captured before we replace window.fetch, plus timeout helpers. */
let native: typeof fetch | null = null;

/** Origin of the API when it lives on another host (VITE_API_URL); '' when same-origin. */
export const API_ORIGIN: string = (() => {
  try { const v = (import.meta as any).env?.VITE_API_URL as string | undefined; return v ? new URL(v).origin : ''; }
  catch { return ''; }
})();

export function captureNativeFetch() {
  if (!native) native = globalThis.fetch.bind(globalThis);
}
export function _setNativeFetch(f: typeof fetch) { native = f; }

export function nativeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  captureNativeFetch();
  return native!(input, init);
}

/** True for "couldn't reach the server" failures (offline, DNS, TLS, our own timeout) — not for HTTP errors or user aborts. */
export function isNetworkError(e: unknown): boolean {
  const err = e as { name?: string } | null;
  return e instanceof TypeError || err?.name === 'TimeoutError';
}

/** fetch with a hard timeout. A caller-supplied AbortSignal still aborts normally (and is NOT treated as a network error). */
export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit | undefined, ms?: number): Promise<Response> {
  if (!ms) return nativeFetch(input, init);
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, ms);
  const outer = init?.signal;
  const onOuterAbort = () => ctrl.abort();
  if (outer) {
    if (outer.aborted) ctrl.abort(); else outer.addEventListener('abort', onOuterAbort, { once: true });
  }
  try {
    return await nativeFetch(input, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (timedOut) throw Object.assign(new Error('Request timed out'), { name: 'TimeoutError' });
    throw e;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onOuterAbort);
  }
}
