/**
 * The confirmation-pill store.
 *
 * `toast()` is callable from anywhere — a store action, a promise handler,
 * anything outside React — so the message lives here rather than in the
 * component, and the screen renders a single `ToastHost` for it.
 */
import { create } from './store';

interface ToastState {
  message: string | null;
  /** Bumped on every call so the same text twice still restarts the timer. */
  nonce: number;
  show(message: string): void;
  hide(): void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  nonce: 0,
  show(message) {
    set((s) => ({ message, nonce: s.nonce + 1 }));
  },
  hide() {
    set({ message: null });
  },
}));

export const toast = (message: string) => useToastStore.getState().show(message);
