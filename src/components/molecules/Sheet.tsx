/**
 * The bottom sheet every secondary surface in the design lives in.
 *
 * The board stays visible under a scrim while a solid grouped-grey panel
 * slides up over it — you can still see the drawing you are granting someone access to. So
 * sheets are components rendered by the screen that owns them, not routes.
 *
 * On a wide screen the same panel becomes a centred card: a sheet pinned to the
 * bottom edge of a 27" monitor is a long way from the header button that opened
 * it, and the design's own tablet/desktop breakpoint (mobile/docs/03-styles)
 * already expects the layout to reflow.
 */
import { createContext, useContext, useId, useRef, type PointerEvent, type ReactNode } from 'react';

import { useT } from '../../features/i18n';
import { SheetBack } from './sheet-back';
import { useDialogFocus } from '../../hooks/use-dialog-focus';
import { useEscape } from '../../hooks/use-escape';
import { IconButton } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
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
  /** The title set big and to the left, for a sheet that is one task (sign in). */
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
        className="sb-scrim absolute inset-0 bg-black/30"
      />

      <div
        className={`sb-sheet relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-t-[16px] bg-sheet shadow-[0_-8px_40px_rgba(0,0,0,0.18)] ${wide ? 'sm:max-w-[680px]' : 'sm:max-w-[420px]'} sm:max-h-[min(720px,86vh)] sm:rounded-[14px] sm:shadow-[0_20px_60px_rgba(0,0,0,0.24)]`}
      >
        {/* Grab zone: the handle and the title row follow a downward drag. */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="touch-none max-sm:cursor-grab"
        >
          <div className="flex justify-center pt-[5px] sm:hidden">
            <div className="h-[5px] w-9 rounded-full bg-text/20" />
          </div>

          {/* The title sits in the middle of three columns, so it stays centred
              whether or not there is a back button on its left. A large title
              gets a row of its own under the buttons. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-1.5 pb-2 sm:pt-3">
            <div className="flex">
              {onBack ? (
                <IconButton icon="back" label={backLabel} onClick={onBack} size={30} iconSize={14} tipSide="bottom" />
              ) : null}
            </div>
            {large ? (
              <span />
            ) : (
              <h2
                id={titleId}
                className="max-w-[60vw] truncate text-center text-[1rem] font-semibold tracking-[-0.01em] sm:max-w-[280px]"
              >
                {title}
              </h2>
            )}
            <div className="flex justify-end">
              <IconButton icon="close" label={closeLabel} onClick={onClose} size={30} iconSize={13} />
            </div>
          </div>
          {large ? (
            <h2 id={titleId} className="px-7 pb-2 text-[1.5rem] leading-tight font-bold tracking-[-0.02em]">
              {title}
            </h2>
          ) : null}
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 pt-1.5 pb-5">
          {children}
        </div>

        {/* A toast raised from inside the sheet ("Code copied") has to clear the
            scrim, so the sheet hosts its own above the panel. */}
        <ToastHost top={24} />
      </div>
    </div>
  );
}

/** True inside a `SheetGroup`: its rows share the group's card instead of each wearing one. */
const InGroup = createContext(false);

/**
 * A titled list of rows in one white card on the grouped ground, parted by
 * inset hairlines: the settings shape.
 */
export function SheetGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-1.5">
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      <div className="sb-group overflow-hidden rounded-[12px] bg-glass-row">
        <InGroup.Provider value>{children}</InGroup.Provider>
      </div>
      {footer ? <p className="px-3 text-[0.75rem] leading-snug text-text-secondary">{footer}</p> : null}
    </section>
  );
}

/** A row of the "label + description + control" shape the sheets are made of. */
export function SheetRow({
  title,
  description,
  left,
  right,
  onClick,
  ariaLabel,
  tone = 'default',
  ...aria
}: {
  title: string;
  description?: ReactNode;
  /** An icon or avatar before the text. */
  left?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  /** `danger` for the destructive rows at the end of a group; `accent` for a row that is a link. */
  tone?: 'default' | 'danger' | 'accent';
  role?: 'radio';
  'aria-checked'?: boolean;
  'aria-current'?: 'true';
  disabled?: boolean;
}) {
  const grouped = useContext(InGroup);
  const body = (
    <>
      {left}
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[0.9375rem] leading-tight ${tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-accent-text' : ''}`}
        >
          {title}
        </div>
        {description ? (
          <div className="mt-0.5 text-[0.75rem] leading-snug text-text-secondary">{description}</div>
        ) : null}
      </div>
      {right}
    </>
  );
  const pad = 'touch-44 flex min-h-10 w-full items-center justify-between gap-3 px-3 py-1.5';
  const content = onClick ? (
    <button
      type="button"
      aria-label={ariaLabel ?? title}
      onClick={onClick}
      className={`${pad} text-left transition-colors hover:bg-fill active:bg-fill-strong disabled:cursor-default disabled:hover:bg-transparent`}
      {...aria}
    >
      {body}
    </button>
  ) : (
    <div className={pad}>{body}</div>
  );

  return grouped ? content : <div className="overflow-hidden rounded-[12px] bg-glass-row">{content}</div>;
}

/** The small grey heading over a group or a field, lined up with the text under it. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 text-[0.8125rem] font-medium text-text-secondary">{children}</div>;
}

/** The chevron at the end of a row that leads somewhere. */
export function RowChevron() {
  return <Icon name="chevron" size={13} className="flex-none text-text-tertiary" />;
}
