/**
 * The bottom sheet every secondary surface in the design lives in.
 *
 * The board stays visible under a scrim while a solid panel slides up over
 * it — you can still see the drawing you are granting someone access to. So
 * sheets are components rendered by the screen that owns them, not routes.
 *
 * On a wide screen the same panel becomes a centred card: a sheet pinned to the
 * bottom edge of a 27" monitor is a long way from the header button that opened
 * it, and the design's own tablet/desktop breakpoint (mobile/docs/03-styles)
 * already expects the layout to reflow.
 */
import { createContext, useContext, useId, useRef, type PointerEvent, type ReactNode } from 'react';

import { LineColor, type Line } from '../../lib/theme';
import { useT } from '../../features/i18n';
import { SheetBack } from './sheet-back';
import { useDialogFocus } from '../../hooks/use-dialog-focus';
import { useEscape } from '../../hooks/use-escape';
import { IconButton } from './Button';
import { GlassPanel } from './Glass';
import { ToastHost } from './Toast';

export function Sheet({
  open,
  title,
  onClose,
  children,
  closeLabel = 'Close',
  wide = false,
  large = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
  /** A wider card on desktop, for sheets with a preview (AI). */
  wide?: boolean;
  /** The title set big, for a sheet that is one task (sign in). */
  large?: boolean;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const onBack = useContext(SheetBack);
  const backLabel = useT().back;
  useDialogFocus(open, dialog);

  // Escape closes the sheet, which is what the mobile app's Android back
  // gesture does and what a browser user will try first.
  useEscape(open, onClose);

  // Dragging the handle or the title row down dismisses it, as the handle promises.
  const drag = useRef<{ y: number; t: number } | null>(null);
  const panelOf = (e: PointerEvent) => e.currentTarget.closest<HTMLElement>('.sb-sheet');
  const onDragStart = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { y: e.clientY, t: e.timeStamp };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const panel = panelOf(e);
    if (d && panel) panel.style.translate = `0 ${Math.max(0, e.clientY - d.y)}px`;
  };
  const onDragEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    const panel = panelOf(e);
    if (!d || !panel) return;
    const dy = e.clientY - d.y;
    const fast = dy / Math.max(1, e.timeStamp - d.t) > 0.6;
    if (dy > 90 || (dy > 24 && fast)) onClose();
    else panel.style.translate = '';
  };

  if (!open) return null;

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col justify-end outline-none sm:items-center sm:justify-center sm:p-6"
    >
      {/* Tap-outside-to-close, hidden from assistive tech: it does exactly what
          the close button beside the title does, and announcing both gives a
          screen-reader user two identical "Close" targets. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="sb-scrim absolute inset-0 bg-[rgba(15,27,45,0.28)]"
      />

      <GlassPanel
        level="panel"
        radius={16}
        border={null}
        className={`sb-sheet relative flex max-h-[82vh] w-full flex-col rounded-b-none ${wide ? 'sm:max-w-[680px]' : 'sm:max-w-[440px]'} sm:max-h-[min(720px,86vh)] sm:rounded-b-[16px]`}
        style={{ boxShadow: '0 -10px 36px rgba(15,27,45,0.18)' }}
      >
        {/* Grab zone: the handle and the title row follow a downward drag. */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="touch-none max-sm:cursor-grab"
        >
          <div className="flex justify-center pt-1.5 sm:hidden">
            <div className="h-1 w-9 rounded-full bg-text/15" />
          </div>

          <div className="flex items-center justify-between gap-2.5 border-b border-line px-4 pt-1 pb-2.5 sm:pt-3">
            {onBack ? (
              <IconButton
                icon="back"
                label={backLabel}
                onClick={onBack}
                size={32}
                iconSize={15}
                tipSide="bottom"
                className="touch-44 -ml-1"
              />
            ) : null}
            <h2
              id={titleId}
              className={`flex-1 truncate font-bold ${large ? 'text-[1.75rem] leading-tight tracking-[-0.6px]' : 'text-[1.125rem] tracking-[-0.3px]'}`}
            >
              {title}
            </h2>
            <IconButton
              icon="close"
              label={closeLabel}
              onClick={onClose}
              size={32}
              iconSize={15}
              className="touch-44"
            />
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 pt-3.5 pb-5">
          {children}
        </div>

        {/* A toast raised from inside the sheet ("Code copied") has to clear the
            scrim, so the sheet hosts its own above the panel. */}
        <ToastHost top={24} />
      </GlassPanel>
    </div>
  );
}

/** True inside a `SheetGroup`: its rows share the group's card instead of each wearing one. */
const InGroup = createContext(false);

/**
 * A titled list of rows in one card, divided by hairlines — the settings
 * shape. Each group sits on its own line, like the menu's sections.
 */
export function SheetGroup({ title, line, children }: { title?: string; line?: Line; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-1.5">
      {title ? <SectionLabel line={line}>{title}</SectionLabel> : null}
      <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line-strong bg-background">
        <InGroup.Provider value>{children}</InGroup.Provider>
      </div>
    </section>
  );
}

/** A row of the "label + description + control" shape the sheets are made of. */
export function SheetRow({
  title,
  description,
  right,
  onClick,
  ariaLabel,
  tone = 'default',
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  /** `danger` for the destructive rows at the end of a group. */
  tone?: 'default' | 'danger';
}) {
  const grouped = useContext(InGroup);
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className={`text-[0.875rem] leading-tight font-semibold ${tone === 'danger' ? 'text-danger' : ''}`}>{title}</div>
        {description ? (
          <div className="mt-0.5 text-[0.75rem] leading-snug text-text-secondary">{description}</div>
        ) : null}
      </div>
      {right}
    </>
  );
  const pad = 'flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2';
  const content = onClick ? (
    <button
      type="button"
      aria-label={ariaLabel ?? title}
      onClick={onClick}
      className={`${pad} text-left transition hover:bg-surface active:bg-surface-selected`}
    >
      {body}
    </button>
  ) : (
    <div className={pad}>{body}</div>
  );

  return grouped ? (
    content
  ) : (
    <GlassPanel level="row" radius={12} border="var(--color-line-strong)">
      {content}
    </GlassPanel>
  );
}

/**
 * A section heading inside sheets and screens, set like a station on a line
 * map: a ringed stop in the section's line colour, then the name.
 */
export function SectionLabel({ children, line = 'ink' }: { children: ReactNode; line?: Line }) {
  return (
    <div className="flex items-center gap-2 text-[0.8125rem] font-bold text-text">
      <span
        aria-hidden="true"
        className="h-3 w-3 flex-none rounded-full border-[3px] bg-background"
        style={{ borderColor: LineColor[line] }}
      />
      {children}
    </div>
  );
}
