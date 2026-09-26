/**
 * A very small external store, in the shape of the Zustand API the mobile app
 * uses — `create(set, get)` returning a hook with an optional selector.
 *
 * The mobile stores are ported here almost verbatim, and rather than add a
 * state library for it, React 19's own `useSyncExternalStore` does the whole
 * job in forty lines: subscribe, snapshot, and a selector so a component only
 * re-renders when the slice it reads actually changes.
 */
import { useSyncExternalStore } from 'react';

export type Setter<T> = (patch: Partial<T> | ((state: T) => Partial<T>)) => void;
export type Getter<T> = () => T;

export interface StoreApi<T> {
  getState: Getter<T>;
  setState: Setter<T>;
  subscribe(listener: (state: T, previous: T) => void): () => void;
}

export type UseStore<T> = StoreApi<T> & {
  (): T;
  <S>(selector: (state: T) => S): S;
};

export function create<T extends object>(
  init: (set: Setter<T>, get: Getter<T>) => T,
): UseStore<T> {
  let state: T;
  const listeners = new Set<(state: T, previous: T) => void>();

  const get: Getter<T> = () => state;
  const set: Setter<T> = (patch) => {
    const previous = state;
    const next = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...next };
    for (const listener of listeners) listener(state, previous);
  };

  state = init(set, get);

  const subscribe = (listener: (state: T, previous: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // `getSnapshot` must be referentially stable for object slices, so a selector
  // returning a fresh object every call would loop. Every selector in this app
  // reads a primitive or an existing reference, which is the contract here.
  function useStore<S>(selector?: (state: T) => S) {
    return useSyncExternalStore(
      subscribe,
      () => (selector ? selector(state) : (state as unknown as S)),
      () => (selector ? selector(state) : (state as unknown as S)),
    );
  }

  return Object.assign(useStore, { getState: get, setState: set, subscribe }) as UseStore<T>;
}

/**
 * localStorage persistence for a store slice. Reads once at module load (there
 * is no async storage in a browser, so unlike mobile there is no "hydrated"
 * gate to wait for) and writes back on every change.
 */
export function persisted<T extends object, P>(
  store: StoreApi<T>,
  key: string,
  partialize: (state: T) => P,
): P | null {
  let initial: P | null = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) initial = JSON.parse(raw) as P;
  } catch {
    // A quota-blocked or private-mode browser is not an error: the app simply
    // does not remember anything between visits.
  }

  let queued: number | null = null;
  store.subscribe((state) => {
    if (queued !== null) return;
    // Coalesce a burst of writes (dragging a slider, a rename keystroke) into
    // one serialization per frame.
    queued = window.setTimeout(() => {
      queued = null;
      try {
        localStorage.setItem(key, JSON.stringify(partialize(state)));
      } catch {
        /* ignore */
      }
    }, 0);
  });

  return initial;
}
