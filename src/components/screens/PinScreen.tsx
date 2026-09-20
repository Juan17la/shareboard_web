/**
 * The 4-digit PIN gate on a private board.
 *
 * It draws its own keypad instead of a number field. The design asks for it,
 * and it earns its place: the keys are large, the four dots make the length
 * obvious without a caret, and there is nothing on screen but the one thing
 * being asked for — which matters for the audience this app is aimed at. The
 * number row on a physical keyboard types into it too, since a browser has one.
 *
 * The PIN is submitted the moment the fourth digit lands; there is no confirm
 * button to hunt for, and a wrong one clears itself so the next attempt starts
 * clean.
 */
import { useEffect, useRef, useState } from 'react';

import { useT } from '../../features/i18n';
import { Colors } from '../../lib/theme';

import { Backdrop } from '../ui/Backdrop';
import { Icon } from '../ui/Icon';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

export function PinScreen({
  error,
  onSubmit,
}: {
  /** Set when the previous attempt was rejected. */
  error: string | null;
  onSubmit: (pin: string) => void;
}) {
  const t = useT();
  const [pin, setPin] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const press = (key: string) => {
    if (!key) return;
    if (key === 'back') {
      setPin((current) => current.slice(0, -1));
      return;
    }
    setPin((current) => {
      if (current.length >= 4) return current;
      const next = current + key;
      if (next.length === 4) {
        // Let the fourth dot paint before the screen changes under the finger,
        // then hand it over and reset for whatever comes back.
        timer.current = window.setTimeout(() => {
          setPin('');
          onSubmit(next);
        }, 160);
      }
      return next;
    });
  };

  // The keypad is the primary control, but a keyboard is right there.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        press('back');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // `press` closes over nothing that changes between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="relative h-full overflow-y-auto">
      <Backdrop variant="pin" />
      <div className="relative mx-auto flex min-h-full w-full max-w-[360px] flex-col items-center gap-4 px-6 py-12">
        <div className="grid h-[46px] w-[46px] place-items-center rounded-[15px] border border-line bg-glass-solid">
          <Icon name="lock" size={22} />
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-[20px] leading-tight font-extrabold tracking-[-0.4px]">
            {t.pinTitle}
          </h1>
          <p className="text-[13px] leading-snug text-[#565D6C]">
            {error ? t.pinWrong : t.pinSub}
          </p>
        </div>

        <div
          className="mt-1.5 mb-0.5 flex gap-3"
          role="status"
          aria-label={`${pin.length} / 4`}
        >
          {[0, 1, 2, 3].map((i) => {
            const filled = i < pin.length;
            return (
              <span
                key={i}
                className="h-3.5 w-3.5 rounded-full transition"
                style={{
                  background: filled ? Colors.accent : 'transparent',
                  border: filled ? 'none' : `2px solid ${Colors.borderDashed}`,
                }}
              />
            );
          })}
        </div>

        <div className="min-h-2 flex-1" />

        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key, index) => (
            <button
              key={`${key}-${index}`}
              type="button"
              aria-label={key === 'back' ? t.deleteDigit : key || undefined}
              aria-hidden={key ? undefined : true}
              disabled={!key}
              onClick={() => press(key)}
              className={
                key
                  ? 'flex h-[60px] w-[74px] items-center justify-center rounded-[18px] border border-line bg-glass-solid text-[21px] font-bold shadow-card transition hover:bg-surface-selected active:bg-surface-selected'
                  : 'h-[60px] w-[74px]'
              }
            >
              {key === 'back' ? <Icon name="close" size={20} /> : key}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
