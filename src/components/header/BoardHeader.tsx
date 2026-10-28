/**
 * The board's header: which board this is, how to get others in, and the one
 * button everything else hangs off.
 *
 * It floats over the canvas with nothing behind the row — no bar, no glass, no
 * fade — only each button on its own small solid chip, so the board really
 * does run edge to edge — "enfocada en la pizarra y no en la interfaz"
 * (mobile/docs/01). One row on every screen: the name and who is here on the
 * left, Share and the menu on the right. Settings, other boards, export,
 * access, people and the assistant all live in the menu, grouped.
 */
import { useT, useTf } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { Css, StatusColors } from '../../lib/theme';

import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function BoardHeader({
  onOpenPeople,
  onOpenMenu,
  onOpenShare,
}: {
  onOpenPeople: () => void;
  onOpenMenu: () => void;
  onOpenShare: () => void;
}) {
  const t = useT();
  const tf = useTf();
  const meta = useBoardStore((s) => s.meta);
  const participants = useBoardStore((s) => s.participants);
  const connection = useBoardStore((s) => s.connection);
  const canEdit = useBoardStore((s) => s.canEditNow());

  const online = connection === 'online';
  // The offline board (plans/34): nobody else is on it, and there is no code yet — Share makes one.
  const local = connection === 'local';
  const statusColor = online
    ? StatusColors.online
    : local
      ? Css.textSecondary
      : connection === 'offline'
      ? StatusColors.offline
      : StatusColors.connecting;
  const statusLabel = online
    ? participants.length === 1
      ? t.onlineOne
      : tf('onlineMany', { N: participants.length })
    : local
      ? t.localStatus
      : connection === 'offline'
      ? t.offline
      : t.connecting;

  const status = (
    <>
      <span
        className={`h-1.5 w-1.5 flex-none rounded-full ${online ? 'sb-pulse' : ''}`}
        style={{ background: statusColor }}
      />
      <span className="truncate">{statusLabel}</span>
      {!canEdit && meta ? (
        <>
          <span className="text-text-tertiary">·</span>
          <span className="font-bold text-text-tertiary">{t.viewOnly}</span>
        </>
      ) : null}
    </>
  );
  const statusClass = 'flex min-w-0 items-center gap-1.5 text-[0.75rem] font-semibold text-text-secondary';

  return (
    <header
      data-board-header
      className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-2 sm:px-4 sm:pt-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="pointer-events-auto min-w-0 px-1 py-0.5">
          <h1
            title={meta?.name}
            className="truncate text-[0.9375rem] leading-tight font-extrabold tracking-[-0.2px]"
          >
            {meta?.name ?? t.appName}
          </h1>
          {/* Who is here is one tap away: the status line opens the list. */}
          {local ? (
            <div className={`mt-px ${statusClass}`}>{status}</div>
          ) : (
            <button
              type="button"
              aria-label={`${t.connectedPeople}: ${statusLabel}`}
              data-tip={participants.map((p) => p.nickname).join(', ') || t.connectedPeople}
              data-tip-side="bottom"
              onClick={onOpenPeople}
              className={`touch-44 -ml-1 mt-px rounded-[8px] px-1 py-0.5 transition hover:bg-surface-selected ${statusClass}`}
            >
              {status}
            </button>
          )}
        </div>

        <div className="pointer-events-auto flex flex-none items-center gap-2">
          {/* The primary action says what it is. */}
          <button
            type="button"
            aria-label={t.share}
            data-tip={t.share}
            data-tip-side="bottom"
            onClick={onOpenShare}
            className="touch-44 flex h-10 flex-none items-center justify-center gap-1.5 rounded-full bg-accent pr-4 pl-3 text-white shadow-accent transition hover:bg-accent-deep"
          >
            <Icon name="share" size={18} />
            <span className="text-[0.875rem] font-bold">{t.share}</span>
          </button>
          <IconButton icon="more" label={t.boardMenu} onClick={onOpenMenu} size={40} className="touch-44" />
        </div>
      </div>
    </header>
  );
}
