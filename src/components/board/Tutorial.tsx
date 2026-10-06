/**
 * The first-run walkthrough (mobile/docs/plans/33): six coach marks over the
 * real interface — the board dimmed around the thing being shown, a caption,
 * Next and Skip. The dimming lets every click through, so a step can be done
 * for real: drawing something finishes the first, selecting it the fourth;
 * Next always works. It runs once (`tutorialDone` in the session) and again
 * from Settings.
 *
 * Targets are found by what the user sees — the tool's label, the options
 * strip — and measured while the step is up, so a toolbar that moves or wraps
 * is followed.
 */
import { useEffect, useState } from 'react';

import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { useSessionStore } from '../../features/session';
import type { Strings } from '../../features/strings';

interface Step {
  text: 'tourDraw' | 'tourOptions' | 'tourShape' | 'tourSelect' | 'tourArrows' | 'tourShare';
  /** Where the spotlight goes; a caption alone when nothing matches. */
  target: (t: Strings, compact: boolean) => string;
  /** The tool this step needs in hand, its options open. */
  pen?: boolean;
  /** Starts with nothing selected, so selecting is what finishes it. */
  deselect?: boolean;
  /** Done by doing it: the board changed in the way the step asks for. */
  done?: (count: number, selected: number) => boolean;
}

const tool = (label: string) => `[role=toolbar] [aria-label="${label}"]`;

const STEPS: Step[] = [
  { text: 'tourDraw', target: (t) => tool(t.pencil), pen: true, done: (count) => count > 0 },
  { text: 'tourOptions', target: () => '.sb-strip', pen: true },
  { text: 'tourShape', target: (t) => `.sb-strip [aria-label="${t.penShape}"]`, pen: true },
  { text: 'tourSelect', target: (t) => tool(t.select), deselect: true, done: (_, selected) => selected > 0 },
  { text: 'tourArrows', target: (t, compact) => tool(compact ? t.shapes : t.shapeArrow) },
  { text: 'tourShare', target: (t) => `header [aria-label="${t.share}"]` },
];

export function Tutorial({ compact }: { compact: boolean }) {
  const t = useT();
  const done = useSessionStore((s) => s.tutorialDone);
  const setDone = useSessionStore((s) => s.setTutorialDone);
  const canEdit = useBoardStore((s) => s.canEditNow());
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[index];
  const active = !done && canEdit;

  const finish = () => {
    setIndex(0);
    setDone(true);
    // The tutorial said it all: the empty-board hint has nothing to add.
    useSessionStore.getState().dismissHint();
  };
  const next = () => (index === STEPS.length - 1 ? finish() : setIndex(index + 1));

  // Put the pencil in hand with its options open for the steps about it, and
  // advance when the step is done for real — counted from when it came up.
  useEffect(() => {
    if (!active) return;
    const board = useBoardStore.getState();
    if (step.pen) {
      if (board.tool !== 'pen') board.pickTool('pen');
      board.setRailOpen(true);
    }
    if (step.deselect) board.select(null);
    if (!step.done) return;
    const visible = (s: typeof board) => Object.values(s.elements).filter((el) => !el.deleted).length;
    const start = visible(board);
    const unsub = useBoardStore.subscribe((s) => {
      if (!step.done!(visible(s) - start, s.selectedIds.length)) return;
      unsub();
      setIndex((i) => i + 1);
    });
    return unsub;
  }, [active, step]);

  // Follow the target while the step is up: toolbars wrap, strips open late.
  useEffect(() => {
    if (!active) return;
    const measure = () => {
      const el = document.querySelector(step.target(t, compact));
      const r = el?.getBoundingClientRect() ?? null;
      setRect((old) =>
        old && r && old.x === r.x && old.y === r.y && old.width === r.width && old.height === r.height ? old : r,
      );
    };
    measure();
    const timer = setInterval(measure, 250);
    return () => clearInterval(timer);
  }, [active, step, t, compact]);

  if (!active) return null;

  const pad = 6;
  // The caption goes on the side of the target with the most room.
  const below = !rect || rect.top < innerHeight / 2;
  const caption: React.CSSProperties = rect
    ? {
        left: Math.max(12, Math.min(rect.left + rect.width / 2 - 150, innerWidth - 312)),
        ...(below ? { top: rect.bottom + pad + 12 } : { bottom: innerHeight - rect.top + pad + 12 }),
      }
    : { left: '50%', top: '40%', transform: 'translateX(-50%)' };

  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-live="polite">
      {rect ? (
        <div
          className="absolute rounded-[14px] transition-all duration-200"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(15, 18, 32, 0.45), 0 0 0 2px var(--color-accent)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(15,18,32,0.45)]" />
      )}
      <div
        role="dialog"
        aria-label={t[step.text]}
        className="pointer-events-auto absolute flex w-[300px] max-w-[calc(100vw-24px)] flex-col gap-3 rounded-2xl bg-surface p-4 text-text shadow-panel"
        style={caption}
      >
        <p className="text-[0.875rem] leading-snug font-semibold">{t[step.text]}</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.75rem] text-text-tertiary">
            {index + 1}/{STEPS.length}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={finish}
            className="rounded-[10px] px-3 py-1.5 text-[0.7812rem] font-bold text-text-secondary transition hover:bg-surface-selected"
          >
            {t.tourSkip}
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-[10px] bg-accent px-3 py-1.5 text-[0.7812rem] font-extrabold text-white transition hover:bg-accent-deep"
          >
            {index === STEPS.length - 1 ? t.tourDone : t.tourNext}
          </button>
        </div>
      </div>
    </div>
  );
}
