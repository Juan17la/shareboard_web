/**
 * The bottom sheet every secondary surface in the design lives in.
 *
 * The board stays visible under a scrim while a frosted panel slides up over
 * it — you can still see the drawing you are granting someone access to. So
 * sheets are components rendered by the screen that owns them, not routes.
 *
 * On a wide screen the same panel becomes a centred card: a sheet pinned to the
 * bottom edge of a 27" monitor is a long way from the header button that opened
 * it, and the design's own tablet/desktop breakpoint (mobile/docs/03-styles)
 * already expects the layout to reflow.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { useDialogFocus } from '../../hooks/use-dialog-focus';
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
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
  /** A wider card on desktop, for sheets with a preview (AI). */
  wide?: boolean;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(open, dialog);

  // Escape closes the sheet, which is what the mobile app's Android back
  // gesture does and what a browser user will try first.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        className="sb-scrim absolute inset-0 bg-[rgba(21,26,45,0.28)]"
      />

      <GlassPanel
        level="panel"
        radius={26}
        border={null}
        className={`sb-sheet relative flex max-h-[82vh] w-full flex-col rounded-b-none border-t border-t-glass-highlight ${wide ? 'sm:max-w-[720px]' : 'sm:max-w-[520px]'} sm:rounded-b-[26px] sm:border sm:border-glass-highlight`}
        style={{ boxShadow: '0 -12px 40px rgba(21,26,45,0.18)' }}
      >
        {/* The grab handle is decorative on a pointer device, but it is what
            tells a touch user the panel can be dismissed downward. */}
        <div className="flex justify-center pt-2 pb-0.5 sm:hidden">
          <div className="h-1 w-[38px] rounded-full bg-text/15" />
        </div>

        <div className="flex items-center justify-between gap-2.5 px-5 pt-1.5 pb-3.5 sm:pt-4">
          <h2 id={titleId} className="flex-1 truncate text-[1.125rem] font-extrabold tracking-[-0.3px]">{title}</h2>
          <IconButton
            icon="close"
            label={closeLabel}
            onClick={onClose}
            size={30}
            iconSize={15}
            radius={10}
            className="touch-36"
          />
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
          {children}
        </div>

        {/* A toast raised from inside the sheet ("Code copied") has to clear the
            scrim, so the sheet hosts its own above the panel. */}
        <ToastHost top={24} />
      </GlassPanel>
    </div>
  );
}

/** A row of the "label + description + control" shape the sheets are made of. */
export function SheetRow({
  title,
  description,
  right,
  onClick,
  ariaLabel,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="text-[0.8125rem] leading-tight font-bold">{title}</div>
        {description ? (
          <div className="mt-0.5 text-[0.75rem] leading-snug text-text-secondary">{description}</div>
        ) : null}
      </div>
      {right}
    </>
  );

  return (
    <GlassPanel level="row" radius={15}>
      {onClick ? (
        <button
          type="button"
          aria-label={ariaLabel ?? title}
          onClick={onClick}
          className="flex w-full items-center justify-between gap-2.5 p-[13px] text-left transition hover:bg-surface-selected"
        >
          {body}
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2.5 p-[13px]">{body}</div>
      )}
    </GlassPanel>
  );
}

/** Small uppercase section label used above groups inside sheets and screens. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[0.75rem] font-extrabold tracking-[0.9px] text-text-secondary uppercase">
      {children}
    </div>
  );
}
