/**
 * Copy and paste between the board and the system clipboard: the keyboard
 * shortcuts and the right-click menu both go through here.
 *
 * Copy leaves the selection in the store *and* on the system clipboard as
 * `encodeClip` text, so it pastes as the same elements in another tab, another
 * board or the mobile app. The store copy stays as the fallback for a browser
 * that refuses clipboard access.
 */
import { copyText } from '../lib/clipboard';
import { decodeClip, encodeClip } from '../lib/clip';
import type { Point } from '../lib/contract';
import { useBoardStore } from './board-store';

/** Puts what the store just copied on the system clipboard. */
export function copyToSystem(): void {
  const { clipboard } = useBoardStore.getState();
  if (clipboard.length) copyText(encodeClip(clipboard)).catch(() => {});
}

/**
 * Pastes `text` from the system clipboard at `at` (board coordinates; the
 * store offsets it when absent): a Shareboard copy as the same elements, other
 * text as a text element, and with nothing usable the store's own clipboard.
 */
export function pasteText(text: string | null | undefined, at?: Point): void {
  const s = useBoardStore.getState();
  const elements = decodeClip(text);
  if (elements) return s.paste(at, elements);
  const plain = text?.trim();
  if (plain) {
    const { x, y, scale } = s.camera;
    const id = s.addText(
      at ?? { x: (s.viewport.width / 2 - x) / scale, y: (s.viewport.height / 2 - y) / scale },
    );
    if (id) s.updateText(id, { text: plain });
    return;
  }
  s.paste(at);
}

/** The menu's Paste: no `paste` event to read from, so ask the clipboard. */
export async function pasteFromSystem(at?: Point): Promise<void> {
  let text: string | undefined;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    // Denied or unavailable: pasteText falls back to the store's clipboard.
  }
  pasteText(text, at);
}
