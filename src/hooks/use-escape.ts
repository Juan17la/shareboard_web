/**
 * Escape for stacked dialogs: only the one on top reacts, so a confirm dialog
 * opened from a sheet closes alone instead of taking the sheet down with it.
 */
import { useEffect, useRef } from 'react';

const stack: symbol[] = [];

export function useEscape(open: boolean, onClose: () => void) {
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const id = Symbol('escape');
    stack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== id) return;
      e.preventDefault();
      latest.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
    };
  }, [open]);
}
