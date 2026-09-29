import { useSyncExternalStore } from 'react';
import { getState, subscribe, type OfflineState } from './store';

/** Live connectivity + upload-queue status for the current account. */
export function useOffline(): OfflineState {
  return useSyncExternalStore(subscribe, getState, getState);
}
