/**
 * The offline board (mobile/docs/plans/34): one board that lives only in this
 * browser. The app opens on it, it works without a network, and it reaches the
 * server only when it is shared — as a new live board, the local one staying a
 * private copy.
 *
 * Kept in IndexedDB rather than `localStorage`, whose few megabytes a pasted
 * photo or two would use up. One record: the board, under one key.
 */
import { API_BASE_URL } from '../lib/config';
import type { BoardElement, BoardMeta, UserId } from '../lib/contract';
import { newUserId } from '../lib/id';

export interface LocalBoard {
  /** `loc_<uuid>`: the route is `/board/<id>` like any other board's. */
  id: string;
  name: string;
  elements: BoardElement[];
  /** The live board it was last shared as. */
  sharedAs?: string;
  updatedAt: number;
}

export const isLocalId = (id: string) => id.startsWith('loc_');

/** What the header and sheets read for it: this user's own board, with no code to share. */
export const localMeta = (board: LocalBoard, userId: UserId): BoardMeta => ({
  id: board.id,
  shortCode: '',
  name: board.name,
  access: 'public',
  editPolicy: 'everyone',
  editors: [],
  creatorId: userId,
  hasPin: false,
  createdAt: board.updatedAt,
  updatedAt: board.updatedAt,
});

const KEY = 'board';
let opened: Promise<IDBDatabase> | null = null;

function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  opened ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('shareboard', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('local');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opened.then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = act(db.transaction('local', mode).objectStore('local'));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const loadLocal = () => run<LocalBoard | undefined>('readonly', (s) => s.get(KEY));
const saveLocal = (board: LocalBoard) => run('readwrite', (s) => s.put(board, KEY));

/** The local board, made (empty) the first time it is asked for. */
export async function ensureLocal(name: string): Promise<LocalBoard> {
  const board = await loadLocal();
  if (board) return board;
  const fresh: LocalBoard = { id: `loc_${newUserId()}`, name, elements: [], updatedAt: Date.now() };
  await saveLocal(fresh);
  return fresh;
}

/** Changes the stored board, if it is still the one with this id. */
export async function updateLocal(id: string, patch: Partial<Omit<LocalBoard, 'id'>>): Promise<void> {
  const board = await loadLocal();
  if (board?.id === id) await saveLocal({ ...board, ...patch, updatedAt: Date.now() });
}

// --- the five-hour rule ------------------------------------------------------

const ONLINE_KEY = 'shareboard.lastOnlineAt';
const FIVE_HOURS = 5 * 3_600_000;

export function lastOnlineAt(): number {
  try {
    return Number(localStorage.getItem(ONLINE_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** The server answered just now. Written at most once a minute. */
export function markOnline(): void {
  const now = Date.now();
  if (now - lastOnlineAt() < 60_000) return;
  try {
    localStorage.setItem(ONLINE_KEY, String(now));
  } catch {
    // Storage blocked: the live boards stay hidden until the server answers again.
  }
}

/** Live boards are offered while the server was reached in the last five hours. */
export const recentlyOnline = () => Date.now() - lastOnlineAt() <= FIVE_HOURS;

/** Whether the server answers now (`GET /health`, 4 s at most). */
export async function checkOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) markOnline();
    return res.ok;
  } catch {
    return false;
  }
}
