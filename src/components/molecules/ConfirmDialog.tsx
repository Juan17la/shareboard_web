/**
 * The centred alert the design uses for the two destructive actions.
 *
 * Deliberately not `window.confirm`: clearing or deleting a board is the moment
 * the app most needs to look like itself and to say exactly what will happen to
 * *everyone else* on the board, and the browser dialog offers neither the copy
 * layout nor the app's own buttons.
 */
import { useRef } from 'react';

import { useDialogFocus } from '../../hooks/use-dialog-focus';
import { useEscape } from '../../hooks/use-escape';
import { Button } from '../atoms/Button';

export type ConfirmTone = 'warn' | 'danger';

export function ConfirmDialog({
  open,
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
        className="sb-scrim absolute inset-0 bg-black/35"
      />

      {/* An alert: what happens, why it matters, then the two answers side by
          side, the safe one first. */}
      <div className="sb-dialog relative w-full max-w-[300px] overflow-hidden rounded-[14px] bg-sheet shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-1.5 px-4 pt-5 pb-4 text-center">
          <h2 className="text-[1.0625rem] leading-tight font-semibold tracking-[-0.01em] text-balance">{title}</h2>
          <p className="text-[0.8125rem] leading-snug text-text-secondary text-pretty">{body}</p>
          <div className="mt-2.5 flex gap-2">
            <Button label={cancelLabel} variant="secondary" fullWidth disabled={busy} onClick={onCancel} />
            {/* Both uses (clear, delete) destroy work: the answer is always red. */}
            <Button label={confirmLabel} variant="danger" fullWidth loading={busy} onClick={onConfirm} />
          </div>
        </div>
      </div>
    </div>
  );
}
