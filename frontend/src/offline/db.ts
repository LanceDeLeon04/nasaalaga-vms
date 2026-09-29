/**
 * Minimal promise wrapper over IndexedDB (no dependencies).
 * Stores use out-of-line keys. If IndexedDB is unavailable (some private modes) every call rejects and
 * callers degrade to "online only" — we never pretend to have saved something we didn't.
 */
export type StoreName = 'responses' | 'outbox';
const DB_NAME = 'nasaalaga-offline';
const DB_VERSION = 1;
const STORES: StoreName[] = ['responses', 'outbox'];

let dbPromise: Promise<IDBDatabase | null> | null = null;
let memory: Record<StoreName, Map<string, unknown>> | null = null;

/** Test hook: swap IndexedDB for an in-memory backend. */
export function _useMemoryBackend() {
  memory = { responses: new Map(), outbox: new Map() };
}

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function dbAvailable(): Promise<boolean> {
  return memory ? true : (await open()) !== null;
}

async function run<T>(store: StoreName, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  const db = await open();
  if (!db) throw new Error('IndexedDB unavailable');
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = op(tx.objectStore(store));
    tx.oncomplete = () => resolve((req ? (req as IDBRequest).result : undefined) as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

export async function dbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  if (memory) return memory[store].get(key) as T | undefined;
  return run<T | undefined>(store, 'readonly', s => s.get(key));
}

export async function dbPut(store: StoreName, key: string, value: unknown): Promise<void> {
  if (memory) { memory[store].set(key, structuredCloneSafe(value)); return; }
  await run<void>(store, 'readwrite', s => s.put(value, key));
}

export async function dbDelete(store: StoreName, key: string): Promise<void> {
  if (memory) { memory[store].delete(key); return; }
  await run<void>(store, 'readwrite', s => s.delete(key));
}

export async function dbClear(store: StoreName): Promise<void> {
  if (memory) { memory[store].clear(); return; }
  await run<void>(store, 'readwrite', s => s.clear());
}

export async function dbEntries<T>(store: StoreName): Promise<Array<[string, T]>> {
  if (memory) return Array.from(memory[store].entries()).map(([k, v]) => [k, structuredCloneSafe(v) as T]);
  const db = await open();
  if (!db) throw new Error('IndexedDB unavailable');
  return new Promise((resolve, reject) => {
    const out: Array<[string, T]> = [];
    const tx = db.transaction(store, 'readonly');
    const cur = tx.objectStore(store).openCursor();
    cur.onsuccess = () => {
      const c = cur.result;
      if (c) { out.push([String(c.key), c.value as T]); c.continue(); }
    };
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

const structuredCloneSafe = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
