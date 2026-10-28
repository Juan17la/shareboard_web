/**
 * The first-run walkthrough (mobile/docs/plans/33): six coach marks over the
 * real interface — the board dimmed around the thing being shown, a caption,
 * Next and Skip. The dimming lets every click through, so a step can be done
 * for real: drawing something finishes the first, selecting it the fourth;
 * Next always works. On first run it is only offered — a card with Not now
 * and Show me around, gone with the first stroke — so nothing stands between
 * a new user and the board; it runs again from Settings (`tutorialDone`).
 *
 * Targets are found by what the user sees — the tool's label, the options
 * strip — and measured while the step is up, so a toolbar that moves or wraps
 * is followed.
 */
import { useEffect, useState } from 'react';

import { useT } from '../../features/i18n';
import { hasContent, useBoardStore } from '../../features/board-store';
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
  { text: 'tourShape', target: (t) => tool(t.pencil), pen: true },
  { text: 'tourSelect', target: (t) => tool(t.select), deselect: true, done: (_, selected) => selected > 0 },
  { text: 'tourArrows', target: (t, compact) => tool(compact ? t.shapes : t.shapeArrow) },
  { text: 'tourShare', target: (t) => `header [aria-label="${t.share}"]` },
];

export function Tutorial({
  compact,
  offerTop,
}: {
  compact: boolean;
  /** Where the first-run offer sits. */
  offerTop: number;
}) {
  const t = useT();
  const done = useSessionStore((s) => s.tutorialDone);
  const setDone = useSessionStore((s) => s.setTutorialDone);
  const canEdit = useBoardStore((s) => s.canEditNow());
  const empty = useBoardStore((s) => !hasContent(s));
  // -1 is the offer: first run asks; a replay from Settings starts at once.
  const [index, setIndex] = useState(() => (useSessionStore.getState().tutorialDone ? 0 : -1));
  const [rect, setRect] = useState<DOMRect | null>(null);
  const offer = index < 0;
  const step = STEPS[Math.max(0, index)];
  const text = offer ? 'tourOffer' : step.text;
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
    if (!active || offer) return;
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
  }, [active, offer, step]);

  // Follow the target while the step is up: toolbars wrap, strips open late.
  useEffect(() => {
    if (!active || offer) return;
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
  }, [active, offer, step, t, compact]);

  // Drawing answers the offer: they found their way without it. The pencil is
  // in hand meanwhile, so the first stroke takes no tap at all.
  useEffect(() => {
    if (!active || !offer || !empty) return;
    useBoardStore.getState().setTool('pen');
    return useBoardStore.subscribe((s) => {
      if (!hasContent(s)) return;
      setIndex(0);
      setDone(true);
    });
  }, [active, offer, empty, setDone]);

  if (!active || (offer && !empty)) return null;

  const pad = 6;
  const cardW = 300;
  const gap = pad + 12;
  // Beside a target near a side edge (the toolbar standing on the left), so
  // the card doesn't cover the buttons above and below it; otherwise above or
  // below it, whichever has more room.
  const side = !rect
    ? null
    : rect.right < innerWidth / 3 && innerWidth - rect.right - gap >= cardW + 12
      ? 'right'
      : rect.left > (innerWidth * 2) / 3 && rect.left - gap >= cardW + 12
        ? 'left'
        : null;
  const below = !rect || rect.top < innerHeight / 2;
  // The offer has no target: it sits just under the header, the board left clear.
  const caption: React.CSSProperties = !rect
    ? { left: '50%', top: offer ? offerTop : '40%', transform: 'translateX(-50%)' }
    : side
      ? {
          ...(side === 'right' ? { left: rect.right + gap } : { left: rect.left - gap - cardW }),
          // Centred on the target, kept on screen (the card is ~110px tall).
          top: Math.max(12, Math.min(rect.top + rect.height / 2 - 55, innerHeight - 122)),
        }
      : {
          left: Math.max(12, Math.min(rect.left + rect.width / 2 - cardW / 2, innerWidth - cardW - 12)),
          ...(below ? { top: rect.bottom + gap } : { bottom: innerHeight - rect.top + gap }),
        };

  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-live="polite">
      {offer ? null : rect ? (
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
        aria-label={t[text]}
        className="pointer-events-auto absolute flex w-[300px] max-w-[calc(100vw-24px)] flex-col gap-3 rounded-2xl bg-surface p-4 text-text shadow-panel"
        style={caption}
      >
        <p className="text-[0.875rem] leading-snug font-semibold">{t[text]}</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.75rem] text-text-tertiary">
            {offer ? null : `${index + 1}/${STEPS.length}`}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={finish}
            className="rounded-[10px] px-3 py-1.5 text-[0.7812rem] font-bold text-text-secondary transition hover:bg-surface-selected"
          >
            {offer ? t.notNow : t.tourSkip}
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-accent px-3.5 py-1.5 text-[0.8125rem] font-bold text-white shadow-accent transition hover:bg-accent-deep"
          >
            {offer ? t.tourStart : index === STEPS.length - 1 ? t.tourDone : t.tourNext}
          </button>
        </div>
      </div>
    </div>
  );
}
