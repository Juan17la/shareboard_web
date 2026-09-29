/**
 * Keyboard focus for a modal dialog: it moves in when the dialog opens, Tab
 * and Shift+Tab cycle inside it instead of walking the board underneath, and
 * on close focus goes back to whatever opened it.
 *
 * The dialog element itself takes the initial focus (give it `tabIndex={-1}`),
 * so a screen reader announces its title first and the first Tab lands on its
 * first control — which also keeps a text field inside from being focused
 * (and a phone keyboard raised) just because a sheet opened.
 */
import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!open || !root) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Focus on the dialog itself counts as "before the first control".
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKey);

    return () => {
      root.removeEventListener('keydown', onKey);
      // The opener may be gone (a sheet that swapped for another): then focus
      // stays on <body>, which is what the browser would do anyway.
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, ref]);
}
