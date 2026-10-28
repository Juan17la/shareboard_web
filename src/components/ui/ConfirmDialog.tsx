/**
 * The centred glass dialog the design uses for the two destructive actions.
 *
 * Deliberately not `window.confirm`: clearing or deleting a board is the moment
 * the app most needs to look like itself and to say exactly what will happen to
 * *everyone else* on the board, and the browser dialog offers neither the copy
 * layout nor the warning glyph the design specifies.
 */
import { useRef } from 'react';

import { useDialogFocus } from '../../hooks/use-dialog-focus';
import { useEscape } from '../../hooks/use-escape';
import { Button } from './Button';
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
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(open, dialog);

  useEscape(open, onCancel);

  if (!open) return null;

  const isDanger = tone === 'danger';
  const accent = isDanger ? 'var(--color-danger)' : 'var(--color-warn)';

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="fixed inset-0 z-60 grid place-items-center p-6 outline-none"
    >
      {/* The scrim is a sibling of the card, not its parent: nesting the card
          inside a clickable backdrop makes the card's own buttons children of a
          button. */}
      <div
        aria-hidden="true"
        onClick={onCancel}
        className="sb-scrim absolute inset-0 bg-[rgba(15,27,45,0.34)]"
      />

      {/* Left-aligned like the sheets: what happens, why it matters, then the
          two answers, the safe one first and the consequence on the right. */}
      <GlassPanel
        level="panel"
        radius={16}
        border={null}
        className="sb-dialog relative w-full max-w-[380px]"
        style={{ boxShadow: '0 18px 48px rgba(15,27,45,0.26)' }}
      >
        <div className="flex flex-col gap-3 p-[18px]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full" style={{ background: isDanger ? 'var(--color-danger-soft)' : 'var(--color-warn-soft)', color: accent }}>
              <Icon name="warning" size={18} />
            </span>
            <h2 className="text-[1.0625rem] leading-tight font-bold tracking-[-0.2px]">{title}</h2>
          </div>
          <p className="text-[0.875rem] leading-snug text-text-secondary">{body}</p>
          <div className="mt-1 flex justify-end gap-2">
            <Button label={cancelLabel} variant="secondary" compact disabled={busy} onClick={onCancel} />
            {/* Both uses (clear, delete) destroy work: the answer is always red. */}
            <Button label={confirmLabel} variant="danger" compact loading={busy} onClick={onConfirm} />
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
