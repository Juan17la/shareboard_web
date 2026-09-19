/**
 * The pill that says the board is not live right now.
 *
 * `offline` is the actionable state: the socket has given up (or is between
 * attempts), nothing drawn is being sent, and the button reconnects at once.
 * `connecting` only needs to be seen, not acted on.
 */
import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { Colors } from '../../lib/theme';

import { Icon } from '../ui/Icon';

export function ConnectionBanner({ top, onRetry }: { top: number; onRetry: () => void }) {
  const t = useT();
  const connection = useBoardStore((s) => s.connection);
  if (connection === 'online' || connection === 'idle') return null;
  const offline = connection === 'offline';

  return (
    <div
      role="status"
      className="pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold shadow-panel backdrop-blur-md"
      style={{
        top,
        borderColor: offline ? 'rgba(196,53,58,0.25)' : Colors.border,
        background: offline ? 'rgba(255,241,241,0.92)' : 'rgba(255,255,255,0.85)',
        color: offline ? Colors.danger : Colors.textSecondary,
      }}
    >
      <Icon name={offline ? 'warning' : 'link'} size={15} />
      <span>{offline ? t.offlineHint : t.reconnecting}</span>
      {offline ? (
        <button
          type="button"
          onClick={onRetry}
          className="pointer-events-auto rounded-full bg-danger px-3 py-1 text-[12px] font-extrabold text-white transition hover:brightness-110"
        >
          {t.retry}
        </button>
      ) : null}
    </div>
  );
}
