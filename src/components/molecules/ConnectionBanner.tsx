/**
 * The pill that says the board is not live right now.
 *
 * `offline` is the actionable state: the socket has given up (or is between
 * attempts), what is drawn waits in the outbox until the reconnect sends it,
 * and the button reconnects at once.
 * `connecting` only needs to be seen, not acted on.
 */
import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { Css } from '../../lib/theme';

import { Icon } from '../atoms/Icon';

export function ConnectionBanner({ top, onRetry }: { top: number; onRetry: () => void }) {
  const t = useT();
  const connection = useBoardStore((s) => s.connection);
  if (connection === 'online' || connection === 'idle' || connection === 'local') return null;
  const offline = connection === 'offline';

  return (
    <div
      role="status"
      className="pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-full border py-1.5 pr-1.5 pl-3 text-[0.8125rem] font-medium shadow-card"
      style={{
        top,
        borderColor: offline ? 'var(--color-danger-soft)' : Css.border,
        background: 'var(--color-glass-row)',
        color: offline ? Css.danger : Css.textSecondary,
      }}
    >
      <Icon name={offline ? 'warning' : 'link'} size={15} />
      <span>{offline ? t.offlineHint : t.reconnecting}</span>
      {offline ? (
        <button
          type="button"
          onClick={onRetry}
          className="touch-36 pointer-events-auto rounded-full bg-danger-soft px-3 py-1 text-[0.8125rem] font-semibold text-danger transition hover:brightness-95"
        >
          {t.retry}
        </button>
      ) : null}
    </div>
  );
}
