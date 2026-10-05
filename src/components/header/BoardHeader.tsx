/**
 * The board's header: who you are looking at, how to get others in, and the
 * two buttons everything else hangs off — the menu and the settings.
 *
 * It floats over the canvas with nothing behind the row — no bar, no glass, no
 * fade — only each button on its own small solid chip, so the board really
 * does run edge to edge — "enfocada en la pizarra y no en la interfaz"
 * (mobile/docs/01). Everything in
 * it is a shortcut into a sheet, except the code chip, which the design makes
 * directly clickable to copy because that is the single most repeated action in
 * a class.
 */
import { useT, useTf } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { formatShortCode } from '../../lib/short-code';
import { Css, StatusColors } from '../../lib/theme';

import { Avatar, AvatarOverflow } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function BoardHeader({
  compact,
  codeCopied,
  onCopyCode,
  onOpenPeople,
  onOpenMenu,
  onOpenPrivacy,
  onOpenShare,
  onOpenExport,
  onOpenSettings,
}: {
  compact: boolean;
  codeCopied: boolean;
  onCopyCode: () => void;
  onOpenPeople: () => void;
  onOpenMenu: () => void;
  onOpenPrivacy: () => void;
  onOpenShare: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
}) {
  const t = useT();
  const tf = useTf();
  const meta = useBoardStore((s) => s.meta);
  const participants = useBoardStore((s) => s.participants);
  const connection = useBoardStore((s) => s.connection);
  const canEdit = useBoardStore((s) => s.canEditNow());

  const online = connection === 'online';
  const statusColor = online
    ? StatusColors.online
    : connection === 'offline'
      ? StatusColors.offline
      : StatusColors.connecting;
  const statusLabel = online
    ? participants.length === 1
      ? t.onlineOne
      : tf('onlineMany', { N: participants.length })
    : connection === 'offline'
      ? t.offline
      : t.connecting;

  // The rail owns the right edge, so on a narrow screen the header stops short
  // of it instead of running underneath.
  const shown = participants.slice(0, compact ? 3 : 5);
  const overflow = participants.length - shown.length;
  const isPrivate = meta?.access === 'private';

  // The header is two clusters: on the left the board (its name, the menu,
  // settings, export), on the right who is here and who may edit (people,
  // permissions, the code to copy) and share.
  return (
    <>
      <header
        data-board-header
        className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-2 sm:px-4 sm:pt-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="pointer-events-auto flex min-w-0 flex-wrap items-center gap-[7px]">
            <div className="min-w-0 max-w-fit flex-1 px-1 py-0.5">
              <h1
                title={meta?.name}
                className="truncate text-[0.9375rem] leading-tight font-extrabold tracking-[-0.2px]"
              >
                {meta?.name ?? t.appName}
              </h1>
              <div className="mt-px flex items-center gap-1.5 text-[0.75rem] font-semibold text-text-secondary">
                <span
                  className={`h-1.5 w-1.5 flex-none rounded-full ${online ? 'sb-pulse' : ''}`}
                  style={{ background: statusColor }}
                />
                <span>{statusLabel}</span>
                {!canEdit && meta ? (
                  <>
                    <span className="text-text-tertiary">·</span>
                    <span className="font-bold text-text-tertiary">{t.viewOnly}</span>
                  </>
                ) : null}
              </div>
            </div>

            <IconButton icon="more" label={t.boardMenu} onClick={onOpenMenu} />
            <IconButton icon="settings" label={t.sheetSettings} onClick={onOpenSettings} />
            <IconButton icon="download" label={t.exportImage} onClick={onOpenExport} />
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-[7px]">
            <button
              type="button"
              aria-label={t.connectedPeople}
              data-tip={participants.map((p) => p.nickname).join(', ') || t.connectedPeople}
              data-tip-side="left"
              onClick={onOpenPeople}
              className="flex flex-none items-center rounded-full border border-line bg-surface p-[3px] transition hover:bg-surface-selected"
            >
              {shown.length === 0 ? (
                <span className="grid h-[26px] w-[26px] place-items-center text-text-secondary">
                  <Icon name="people" size={18} />
                </span>
              ) : (
                shown.map((p, i) => (
                  <Avatar
                    key={p.userId}
                    name={p.nickname}
                    color={p.color}
                    avatar={p.avatar}
                    size={26}
                    overlap={i > 0}
                    title={`${p.nickname} · ${p.role}`}
                  />
                ))
              )}
              {overflow > 0 ? <AvatarOverflow count={overflow} /> : null}
            </button>
            <button
              type="button"
              aria-label={t.privacyShort}
              data-tip={t.privacyShort}
              data-tip-side="bottom"
              onClick={onOpenPrivacy}
              className="touch-36 flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-[7px] transition hover:bg-surface-selected"
            >
              <Icon name={isPrivate ? 'lock' : 'lock-open'} size={14} />
              {/* Below 360px the strip has no room for the word; the icon and its label stay. */}
              <span className="text-[0.75rem] font-bold max-[359px]:hidden">{t.privacyShort}</span>
            </button>

            <button
              type="button"
              aria-label={`${t.code} ${meta?.shortCode ?? ''}`}
              data-tip={t.code}
              data-tip-side="bottom"
              onClick={onCopyCode}
              disabled={!meta}
              className="flex items-center gap-1.5 rounded-md border px-[11px] py-[7px] transition"
              style={{
                borderColor: codeCopied ? 'transparent' : Css.border,
                background: codeCopied ? 'rgba(15,158,142,0.14)' : 'var(--color-surface)',
                color: codeCopied ? '#0B7F72' : Css.text,
              }}
            >
              <Icon name={codeCopied ? 'check' : 'copy'} size={14} />
              <span className="text-[0.8125rem] font-extrabold tracking-[1px]">
                {meta ? formatShortCode(meta.shortCode) : '———·———'}
              </span>
            </button>

            {/* The primary action says what it is once there is room for the word. */}
            <button
              type="button"
              aria-label={t.share}
              data-tip={t.share}
              data-tip-side="bottom"
              onClick={onOpenShare}
              className="touch-36 flex h-9 min-w-9 flex-none items-center justify-center gap-1.5 rounded-[12px] bg-accent px-2.5 text-white shadow-accent transition hover:bg-accent-deep sm:px-3.5"
            >
              <Icon name="share" size={18} />
              <span className="hidden text-[0.8125rem] font-extrabold sm:inline">{t.share}</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
