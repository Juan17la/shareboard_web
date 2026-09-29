/**
 * Every keyboard shortcut on the board, in one listener on the window so they
 * work wherever focus happens to be — but never while something is being
 * typed, and never while a sheet or dialog is open (those own the keyboard).
 *
 * Tools:     V cursor · H hand · P pencil · E eraser · S shapes (last kind) ·
 *            R O Y G L A one kind each · T text · F fill
 * History:   Ctrl/⌘ Z undo · Ctrl/⌘ Shift Z or Ctrl/⌘ Y redo
 * Selection: Delete/Backspace · Escape · Ctrl/⌘ A · Ctrl/⌘ D duplicate ·
 *            Ctrl/⌘ C copy · Ctrl/⌘ X cut · Ctrl/⌘ V paste (under the pointer;
 *            an image on the system clipboard wins over copied elements) ·
 *            arrows nudge (Shift ×10)
 * Camera:    Ctrl/⌘ + / − · Ctrl/⌘ 0 home · Shift 1 fit · Shift or Space held: drag pans
 *
 * An undo halfway through a move would be committed over by the pointer-up,
 * so history keys wait for the pointer to lift (`keys.dragging`).
 */
import { useEffect } from 'react';

import { useBoardStore } from '../features/board-store';
import { currentStrings } from '../features/i18n';
import type { Point, ShapeKind, ToolType } from '../lib/contract';
import { placementSize, shrinkToElement } from '../features/import';
import { ZOOM_STEP } from '../lib/geometry';
import { toast } from '../lib/toast';

const TOOL_KEYS: Record<string, { tool: ToolType; shape?: ShapeKind }> = {
  v: { tool: 'select' },
  h: { tool: 'hand' },
  p: { tool: 'pen' },
  e: { tool: 'eraser' },
  s: { tool: 'shape' },
  r: { tool: 'shape', shape: 'rectangle' },
  o: { tool: 'shape', shape: 'ellipse' },
  y: { tool: 'shape', shape: 'triangle' },
  g: { tool: 'shape', shape: 'polygon' },
  l: { tool: 'shape', shape: 'line' },
  a: { tool: 'shape', shape: 'arrow' },
  t: { tool: 'text' },
  f: { tool: 'fill' },
};

const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * What the keyboard and the pointer tell each other: Space held means the next
 * drag pans; a drag in progress means history keys wait; `pointer` is where it
 * was last over the board, in screen pixels, which is where a paste lands. A
 * plain object rather than store state, because nothing needs to re-render on it.
 */
export const keys = { spaceHeld: false, dragging: false, pointer: null as Point | null };

export function useShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const typing = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
    };

    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const s = useBoardStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.code === 'Space') {
        keys.spaceHeld = true;
        // Space would otherwise scroll the page under some browsers.
        e.preventDefault();
        return;
      }

      // --- camera: for everyone, viewers included ---
      if (mod && (key === '=' || key === '+')) return act(e, () => s.zoomBy(ZOOM_STEP));
      if (mod && key === '-') return act(e, () => s.zoomBy(1 / ZOOM_STEP));
      if (mod && key === '0') return act(e, () => s.setCamera(s.homeCamera()));
      if (e.shiftKey && !mod && (key === '1' || key === '!')) return act(e, () => s.fitCamera());

      if (!s.canEditNow()) return;

      // --- history ---
      if (mod && (key === 'z' || key === 'y')) {
        if (keys.dragging) return;
        return act(e, () => (key === 'y' || e.shiftKey ? s.redo() : s.undo()));
      }

      // --- selection ---
      if (mod && key === 'a') return act(e, () => s.selectAll());
      if (mod && key === 'd') return act(e, () => s.duplicateSelection());
      // Only with something to copy or paste: otherwise the keys stay the browser's.
      if (mod && key === 'c' && s.selectedIds.length) {
        return act(e, () => {
          s.copySelection();
          toast(currentStrings().toastCopiedSelection);
        });
      }
      if (mod && key === 'x' && s.selectedIds.length) return act(e, () => s.cutSelection());
      // Ctrl/⌘ V is left to the browser: it fires `paste` below, which can see
      // an image on the system clipboard (a keydown can't).
      if (mod || e.altKey) return;
      if (e.key === 'Delete' || e.key === 'Backspace') return act(e, () => s.deleteSelection());
      if (e.key === 'Escape') {
        return act(e, () => {
          s.select(null);
          s.setRailOpen(false);
        });
      }
      const nudge = NUDGE[e.key];
      if (nudge && s.selectedIds.length) {
        const step = e.shiftKey ? 10 : 1;
        return act(e, () =>
          s.commitEdit({
            ids: s.selectedIds,
            mode: 'move',
            handle: -1,
            start: { x: 0, y: 0 },
            dx: nudge[0] * step,
            dy: nudge[1] * step,
            patch: null,
          }),
        );
      }

      // --- tools ---
      const pick = TOOL_KEYS[key];
      if (pick && !e.shiftKey) act(e, () => s.pickTool(pick.tool, pick.shape));
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') keys.spaceHeld = false;
    };

    const paste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      const s = useBoardStore.getState();
      if (!s.canEditNow()) return;
      const { x, y, scale } = s.camera;
      const at = keys.pointer ?? { x: s.viewport.width / 2, y: s.viewport.height / 2 };
      const board = { x: (at.x - x) / scale, y: (at.y - y) / scale };

      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        shrinkToElement(file).then(
          (img) => {
            const size = placementSize(img.width, img.height);
            useBoardStore
              .getState()
              .addImage(
                { x: board.x - size.width / 2, y: board.y - size.height / 2 },
                size.width,
                size.height,
                img.uri,
              );
          },
          (err: unknown) => toast(err instanceof Error ? err.message : String(err)),
        );
        return;
      }
      if (s.clipboard.length) {
        e.preventDefault();
        s.paste(keys.pointer ? board : undefined);
      }
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('paste', paste);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('paste', paste);
      keys.spaceHeld = false;
    };
  }, [enabled]);
}

function act(e: KeyboardEvent, run: () => void) {
  e.preventDefault();
  run();
}
