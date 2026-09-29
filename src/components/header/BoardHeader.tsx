/**
 * The board's header: who you are looking at, how to get others in, and the
 * way out.
 *
 * It floats over the canvas behind a blur with a fade to transparent rather
 * than sitting in a bar above it, so the board really does run edge to edge —
 * "enfocada en la pizarra y no en la interfaz" (mobile/docs/01). Everything in
 * it is a shortcut into a sheet, except the code chip, which the design makes
 * directly clickable to copy because that is the single most repeated action in
 * a class.
 */
import { useT, useTf } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { useSessionStore } from '../../features/session';
import { formatShortCode } from '../../lib/short-code';
import { Colors, StatusColors } from '../../lib/theme';

import { Avatar, AvatarOverflow } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function BoardHeader({
  compact,
  landscape,
  codeCopied,
  onCopyCode,
  onOpenPeople,
  onOpenMenu,
  onOpenPrivacy,
  onOpenShare,
  onGoHome,
}: {
  compact: boolean;
  landscape: boolean;
  codeCopied: boolean;
  onCopyCode: () => void;
  onOpenPeople: () => void;
  onOpenMenu: () => void;
  onOpenPrivacy: () => void;
  onOpenShare: () => void;
  onGoHome: () => void;
}) {
  const t = useT();
  const dark = useSessionStore((s) => s.theme === 'dark');
  const toggleTheme = useSessionStore((s) => s.toggleTheme);
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

  // Everything you can *do* with the board, as one strip: the menu, the code
  // (click to copy), who may edit, share. In portrait it is the second row; in
  // landscape there is room for it beside the title, so the header is one row.
  const actions = (
    <div className="pointer-events-auto flex flex-none items-center gap-[7px]">
      <IconButton icon="more" label={t.boardMenu} onClick={onOpenMenu} />
      <IconButton icon={dark ? 'sun' : 'moon'} label={t.theme} title={dark ? t.themeLight : t.themeDark} onClick={toggleTheme} />

      <button
        type="button"
        aria-label={`${t.code} ${meta?.shortCode ?? ''}`}
        data-tip={t.code}
        data-tip-side="bottom"
        onClick={onCopyCode}
        disabled={!meta}
        className="flex items-center gap-1.5 rounded-md border px-[11px] py-[7px] backdrop-blur-md transition"
        style={{
          borderColor: codeCopied ? 'transparent' : Colors.border,
          background: codeCopied ? 'rgba(15,158,142,0.14)' : 'var(--color-glass-solid)',
          color: codeCopied ? '#0B7F72' : Colors.text,
        }}
      >
        <Icon name={codeCopied ? 'check' : 'copy'} size={14} />
        <span className="text-[13px] font-extrabold tracking-[1px]">
          {meta ? formatShortCode(meta.shortCode) : '———·———'}
        </span>
      </button>

      <button
        type="button"
        aria-label={t.privacyShort}
        data-tip={t.privacyShort}
        data-tip-side="bottom"
        onClick={onOpenPrivacy}
        className="flex items-center gap-1.5 rounded-md border border-line bg-glass-solid px-2.5 py-[7px] backdrop-blur-md transition hover:bg-surface-selected"
      >
        <Icon name={isPrivate ? 'lock' : 'lock-open'} size={14} />
        <span className="text-[11.5px] font-bold">{t.privacyShort}</span>
      </button>

      <IconButton icon="share" label={t.share} onClick={onOpenShare} active />
    </div>
  );

  return (
    <>
      {/*
        The soft white-to-transparent wash the header sits on.

        A gradient rather than a blurred panel because a panel has an edge, and
        an edge across the top of an infinite canvas looks like a bar. It is
        separate from the header so it can be non-interactive: it covers the top
        of the board, and a pointer-catching layer there would eat the first
        stroke of anyone drawing near the top. In landscape the header is a
        single row, so the wash is shorter.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20"
        style={{
          height: landscape ? (compact ? 100 : 112) : compact ? 150 : 168,
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-background) 92%, transparent) 0%, color-mix(in srgb, var(--color-background) 72%, transparent) 62%, transparent 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          maskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
        }}
      />

      <header
        className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4"
        // In landscape the rail starts below the header, so the header runs
        // flush to the rail's right edge (ToolRail's `right-2.5` / `sm:right-4`);
        // otherwise it stops short so the strip never runs underneath.
        style={{ paddingRight: landscape ? (compact ? 10 : 16) : compact ? 12 : 16 }}
      >
        {/* Who and where: back, the board, (the actions, in landscape) and who
            else is here. */}
        <div className="pointer-events-auto flex items-center gap-2">
          <IconButton icon="back" label={t.back} onClick={onGoHome} />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] leading-tight font-extrabold tracking-[-0.2px]">
              {meta?.name ?? t.appName}
            </h1>
            <div className="mt-px flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
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

          {/* The strip keeps its natural width; a long board name is what gives
              way (one line, ellipsised) rather than the controls. */}
          {landscape ? actions : null}

          <button
            type="button"
            aria-label={t.connectedPeople}
            data-tip={participants.map((p) => p.nickname).join(', ') || t.connectedPeople}
            data-tip-side="left"
            onClick={onOpenPeople}
            className="flex flex-none items-center rounded-full border border-line bg-glass-solid p-[3px] backdrop-blur-md transition hover:bg-surface-selected"
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
        </div>

        {landscape ? null : <div className="mt-2">{actions}</div>}
      </header>
    </>
  );
}
