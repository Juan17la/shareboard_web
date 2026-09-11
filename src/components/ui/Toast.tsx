/**
 * The confirmation pill. One line, no action, gone in 1.7 s.
 *
 * The fade in and out are one CSS animation with a delay rather than a second
 * piece of state: the pill's whole life is on a fixed timeline, and the only
 * thing React has to decide is when to stop rendering it.
 */
import { useEffect } from 'react';

import { useToastStore } from '../../lib/toast';

/**
 * Renders the current toast. `enabled` lets a screen mute its own host while a
 * sheet is open — the sheet mounts a host of its own, so exactly one is live.
 */
export function ToastHost({
  bottom = 110,
  top,
  enabled = true,
}: {
  bottom?: number;
  top?: number;
  enabled?: boolean;
}) {
  const message = useToastStore((s) => s.message);
  const nonce = useToastStore((s) => s.nonce);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!message) return;
    const clear = setTimeout(hide, 1700);
    return () => clearTimeout(clear);
  }, [message, nonce, hide]);

  if (!message || !enabled) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-70 flex justify-center px-4"
      style={top !== undefined ? { top } : { bottom }}
    >
      <div
        // `nonce` as the key restarts the animation for a second toast with the
        // same text, which is otherwise indistinguishable from the first.
        key={nonce}
        className="rounded-full bg-[rgba(27,32,48,0.9)] px-[15px] py-[9px] text-[12px] font-bold text-white shadow-panel"
        style={{ animation: 'sb-up 0.18s ease, sb-out 0.2s ease 1.5s forwards' }}
      >
        {message}
      </div>
    </div>
  );
}
