/**
 * What a class does together on a board besides drawing on it: reactions that
 * float up everyone's screen, and a countdown everyone sees. Neither is board
 * content — the server relays them and keeps nothing but the countdown's end.
 *
 * The two buttons sit in the camera chip (`BottomControls`); the reactions
 * rise from the bottom-right corner, and the countdown is a pill under the header.
 */
import { useEffect, useId, useRef, useState } from 'react';

import { useT } from '../../features/i18n';
import { customMs, useBoardStore } from '../../features/board-store';
import { REACTIONS, type Reaction } from '../../lib/contract';
import { Css } from '../../lib/theme';
import { toast } from '../../lib/toast';

import { GlassPanel } from '../ui/Glass';
import { Icon, type IconName } from '../ui/Icon';

/** The countdowns offered, in minutes. */
const TIMER_MINUTES = [1, 3, 5, 10];

/** A chip button that opens a small panel under it (a native popover: Escape and a click outside close it). */
function PopButton({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  const id = useId();
  const anchor = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const place = () => {
    const a = anchor.current?.getBoundingClientRect();
    const p = pop.current;
    if (!a || !p) return;
    const { width } = p.getBoundingClientRect();
    p.style.left = `${Math.max(8, Math.min(a.right - width, innerWidth - width - 8))}px`;
    p.style.top = `${a.bottom + 8}px`;
  };
  return (
    <>
      <button
        ref={anchor}
        type="button"
        popoverTarget={id}
        aria-haspopup="true"
        aria-label={label}
        data-tip={label}
        data-tip-side="bottom"
        className="touch-44 flex h-[34px] w-[34px] items-center justify-center rounded-[10px] transition hover:bg-surface-selected"
        style={{ color: Css.text }}
      >
        <Icon name={icon} size={16} />
      </button>
      <div
        ref={pop}
        id={id}
        popover="auto"
        onBeforeToggle={(e) => e.newState === 'open' && requestAnimationFrame(place)}
        onClick={(e) => (e.target as Element).closest('button') && pop.current?.hidePopover()}
        className="glass fixed m-0 gap-1 rounded-2xl p-1.5 text-text shadow-panel [&:popover-open]:flex"
        style={{ inset: 'auto', border: '1px solid var(--color-line)' }}
      >
        {children}
      </div>
    </>
  );
}

export function ReactButton({ onReact }: { onReact: (emoji: Reaction) => void }) {
  const t = useT();
  return (
    <PopButton icon="smiley" label={t.reactions}>
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={emoji}
          onClick={() => onReact(emoji)}
          className="touch-44 grid h-10 w-10 place-items-center rounded-[10px] text-[1.375rem] transition hover:bg-surface-selected"
        >
          {emoji}
        </button>
      ))}
    </PopButton>
  );
}

export function TimerButton({ onTimer }: { onTimer: (ms: number | null) => void }) {
  const t = useT();
  const running = useBoardStore((s) => s.timerEndsAt !== null);
  const [min, setMin] = useState('2');
  const [sec, setSec] = useState('30');
  const choice = 'touch-44 h-10 rounded-[10px] px-3 text-[0.8125rem] font-bold transition hover:bg-surface-selected';
  const field = 'h-9 w-14 rounded-[9px] border border-line bg-surface px-2 text-center font-mono text-[0.875rem] font-bold';
  const custom = customMs(min, sec);
  return (
    <PopButton icon="timer" label={t.timer}>
      <div className="flex flex-col gap-1.5">
        <div className="flex">
          {TIMER_MINUTES.map((m) => (
            <button key={m} type="button" onClick={() => onTimer(m * 60_000)} className={choice}>
              {m} {t.minutes}
            </button>
          ))}
          {running ? (
            <button type="button" onClick={() => onTimer(null)} className={`${choice} text-danger`}>
              {t.timerStop}
            </button>
          ) : null}
        </div>
        {/* Any time up to three hours: minutes and seconds, Enter or Start. */}
        <form
          aria-label={t.timerCustom}
          className="flex items-center gap-1.5 border-t border-line px-1.5 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!custom) return;
            onTimer(custom);
            (e.currentTarget.closest('[popover]') as HTMLElement | null)?.hidePopover();
          }}
        >
          <span className="mr-auto text-[0.75rem] font-bold text-text-secondary">{t.timerCustom}</span>
          <input aria-label={t.minutes} inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} className={field} />
          <span className="text-[0.75rem] font-bold">{t.minutes}</span>
          <input aria-label={t.seconds} inputMode="numeric" value={sec} onChange={(e) => setSec(e.target.value)} className={field} />
          <span className="text-[0.75rem] font-bold">{t.seconds}</span>
          <button type="submit" disabled={!custom} className="touch-44 h-9 rounded-[10px] bg-accent px-3 text-[0.8125rem] font-extrabold text-white transition hover:bg-accent-deep disabled:opacity-40">
            {t.timerStart}
          </button>
        </form>
      </div>
    </PopButton>
  );
}


/** Reactions floating up from the bottom-right corner, clear of the tools, each with who sent it. */
export function ReactionStream({ bottom }: { bottom: number }) {
  const reactions = useBoardStore((s) => s.reactions);
  if (!reactions.length) return null;
  return (
    <div aria-live="polite" className="pointer-events-none absolute right-4 z-30 h-0 w-40" style={{ bottom }}>
      {reactions.map((r, i) => (
        <div
          key={r.id}
          className="sb-float absolute bottom-0 flex flex-col items-center"
          // Side by side when several arrive together, so none hides another.
          style={{ left: (i % 4) * 36 }}
        >
          <span className="text-[2rem] leading-none">{r.emoji}</span>
          {r.who ? (
            <span
              className="mt-1 max-w-24 truncate rounded-full px-1.5 text-[0.6875rem] font-bold text-white"
              style={{ background: r.color }}
            >
              {r.who}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** `m:ss`, or `h:mm:ss` from an hour up. */
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  const ss = String(s % 60).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

/** The countdown, under the header, for everyone on the board. */
export function TimerPill({ top }: { top: number }) {
  const t = useT();
  const endsAt = useBoardStore((s) => s.timerEndsAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const tick = setInterval(() => {
      const at = Date.now();
      setNow(at);
      // Over: say so once, then let it go.
      if (at >= endsAt) {
        clearInterval(tick);
        toast(t.timerUp);
        setTimeout(() => {
          if (useBoardStore.getState().timerEndsAt === endsAt) useBoardStore.getState().setTimerLeft(null);
        }, 4000);
      }
    }, 250);
    return () => clearInterval(tick);
  }, [endsAt, t]);

  if (endsAt === null) return null;
  const left = Math.max(0, endsAt - now);
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center" style={{ top }}>
      <GlassPanel level="chip" radius={16} overflow="visible">
        <div
          role="timer"
          aria-label={t.timer}
          className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[0.9375rem] font-bold"
          style={{ color: left === 0 ? Css.accent : Css.text }}
        >
          <Icon name="timer" size={16} />
          {left === 0 ? t.timerUp : clock(left)}
        </div>
      </GlassPanel>
    </div>
  );
}
