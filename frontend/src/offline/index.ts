import { pruneCache } from './cache';
import { installOfflineFetch } from './fetch';
import { startAutoSync } from './outbox';
import { startPrefetch } from './prefetch';
import { installSessionMirror } from './session';

/** Call once, before React renders. */
export function initOffline() {
  installSessionMirror();
  installOfflineFetch();
  startAutoSync();
  startPrefetch();
  void pruneCache();
}

export { useOffline } from './useOffline';
export { endSession, getOfflineSessionInfo, restoreOfflineSession } from './session';
export { discardItem, exportFailed, flush, hasPendingFor, retryAllFailed, retryItem, SYNCED_EVENT } from './outbox';
