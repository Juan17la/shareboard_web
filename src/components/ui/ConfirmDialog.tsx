/**
 * The centred glass dialog the design uses for the two destructive actions.
 *
 * Deliberately not `window.confirm`: clearing or deleting a board is the moment
 * the app most needs to look like itself and to say exactly what will happen to
 * *everyone else* on the board, and the browser dialog offers neither the copy
 * layout nor the warning glyph the design specifies.
 */
import { useEffect } from 'react';

import { GlassPanel } from './Glass';
import { Icon } from './Icon';

export type ConfirmTone = 'warn' | 'danger';

export function ConfirmDialog({
  open,
  tone = 'warn',
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  tone?: ConfirmTone;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = tone === 'danger';
  const accent = isDanger ? 'var(--color-danger)' : 'var(--color-warn)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-60 grid place-items-center p-6"
    >
      {/* The scrim is a sibling of the card, not its parent: nesting the card
          inside a clickable backdrop makes the card's own buttons children of a
          button. */}
      <div
        aria-hidden="true"
        onClick={onCancel}
        className="sb-scrim absolute inset-0 bg-[rgba(21,26,45,0.34)]"
      />

      <GlassPanel
        level="panel"
        radius={24}
        border="rgba(255,255,255,0.75)"
        className="sb-dialog relative w-full max-w-[320px]"
        style={{ boxShadow: '0 22px 60px rgba(21,26,45,0.28)' }}
      >
        <div className="flex flex-col items-center gap-2.5 px-5 py-[22px] text-center">
          <div
            className="grid h-11 w-11 place-items-center rounded-[15px]"
            style={{
              background: isDanger ? 'var(--color-danger-soft)' : 'var(--color-warn-soft)',
              color: accent,
            }}
          >
            <Icon name="warning" size={24} />
          </div>

          <h2 className="text-[17px] leading-tight font-extrabold tracking-[-0.2px]">{title}</h2>
          <p className="text-[12.5px] leading-relaxed text-text-secondary">{body}</p>

          <div className="mt-1 flex w-full gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="flex-1 rounded-[14px] border border-line-strong bg-white/70 py-[13px] text-[13px] font-extrabold transition hover:bg-white disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              style={{ background: accent }}
              className="flex-1 rounded-[14px] py-[13px] text-[13px] font-extrabold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
