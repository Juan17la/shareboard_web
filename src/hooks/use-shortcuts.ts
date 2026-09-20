/**
 * Every keyboard shortcut on the board, in one listener on the window so they
 * work wherever focus happens to be — but never while something is being
 * typed, and never while a sheet or dialog is open (those own the keyboard).
 *
 * Tools:     V cursor · H hand · P pencil · E eraser · S shapes (last kind) ·
 *            R O Y L A one kind each · T text · F fill
 * History:   Ctrl/⌘ Z undo · Ctrl/⌘ Shift Z or Ctrl/⌘ Y redo
 * Selection: Delete/Backspace · Escape · Ctrl/⌘ A · Ctrl/⌘ D duplicate ·
 *            arrows nudge (Shift ×10)
 * Camera:    Ctrl/⌘ + / − · Ctrl/⌘ 0 home · Shift 1 fit · Space held: drag pans
 *
 * An undo halfway through a move would be committed over by the pointer-up,
 * so history keys wait for the pointer to lift (`keys.dragging`).
 */
import { useEffect } from 'react';

import { useBoardStore } from '../features/board-store';
import type { ShapeKind, ToolType } from '../lib/contract';
import { ZOOM_STEP } from '../lib/geometry';

const TOOL_KEYS: Record<string, { tool: ToolType; shape?: ShapeKind }> = {
  v: { tool: 'select' },
  h: { tool: 'hand' },
  p: { tool: 'pen' },
  e: { tool: 'eraser' },
  s: { tool: 'shape' },
  r: { tool: 'shape', shape: 'rectangle' },
  o: { tool: 'shape', shape: 'ellipse' },
  y: { tool: 'shape', shape: 'triangle' },
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
 * drag pans; a drag in progress means history keys wait. A plain object rather
 * than store state, because nothing needs to re-render on it.
 */
export const keys = { spaceHeld: false, dragging: false };

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

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      keys.spaceHeld = false;
    };
  }, [enabled]);
}

function act(e: KeyboardEvent, run: () => void) {
  e.preventDefault();
  run();
}
