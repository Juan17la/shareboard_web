/**
 * "Draw with AI": a small chat. The server (server/src/ai.ts) answers each
 * message with a drawing centred on what this screen is looking at, as one
 * group. It shows here as a preview first; *Add to board* commits it as this
 * user's own edit (one undo step), *Discard* drops it. Each prompt is
 * independent: the model does not see the board.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { fill, useT } from '../../features/i18n';
import { screenToBoard, useBoardStore } from '../../features/board-store';
import { useSessionStore } from '../../features/session';
import { drawWithAi, drawWithAiLocal } from '../../lib/api';
import type { BoardElement } from '../../lib/contract';
import { contentBounds } from '../../lib/geometry';
import { paintBoard } from '../board/renderer';

import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Sheet } from '../ui/Sheet';

interface Message {
  from: 'you' | 'ai' | 'error';
  text: string;
  /** An AI drawing still waiting for Add/Discard; cleared once decided. */
  elements?: BoardElement[];
}

export function AiSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const userId = useSessionStore((s) => s.userId);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Message[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const addElements = useBoardStore((s) => s.addElements);

  const decide = (i: number, accept: boolean) => {
    const els = log[i].elements ?? [];
    if (accept) {
      addElements(els);
      onClose(); // back to the board to see (and edit) what was added
    }
    setLog((l) =>
      l.map((m, j) =>
        j === i
          ? {
              ...m,
              elements: undefined,
              text: `${m.text} ${accept ? fill(t.aiAdded, { N: String(els.length) }) : t.aiDiscarded}`.trim(),
            }
          : m,
      ),
    );
  };

  const push = (msg: Message) => {
    setLog((l) => [...l, msg]);
    requestAnimationFrame(() => end.current?.scrollIntoView({ block: 'end' }));
  };

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    const { meta, boardToken, viewport } = useBoardStore.getState();
    if (!text || busy || !meta) return;
    push({ from: 'you', text });
    setPrompt('');
    setBusy(true);
    try {
      const at = screenToBoard(viewport.width / 2, viewport.height / 2);
      const res =
        useBoardStore.getState().connection === 'local'
          ? await drawWithAiLocal(text, at, userId)
          : await drawWithAi(meta.id, text, at, { userId, token: boardToken ?? '' });
      push({ from: 'ai', text: res.reply, elements: res.elements.length ? res.elements : undefined });
    } catch (err) {
      push({ from: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} title={t.sheetAi} onClose={onClose} closeLabel={t.close} wide>
      <div className="flex flex-col gap-3">
        {log.length ? (
          <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto" aria-live="polite">
            {log.map((m, i) => (
              <div
                key={i}
                className={[
                  'flex max-w-[85%] flex-col gap-2 rounded-xl px-3 py-2 text-[0.8125rem] leading-snug',
                  m.from === 'you'
                    ? 'self-end bg-accent text-white'
                    : m.from === 'error'
                      ? 'self-start bg-danger-soft text-danger'
                      : 'self-start bg-surface-selected',
                ].join(' ')}
              >
                {m.text ? <p>{m.text}</p> : null}
                {m.elements ? (
                  <>
                    <Preview elements={m.elements} />
                    <div className="flex gap-2">
                      <Button compact icon="check" label={t.aiAccept} onClick={() => decide(i, true)} />
                      <Button
                        compact
                        variant="secondary"
                        label={t.aiDiscard}
                        onClick={() => decide(i, false)}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ))}
            {busy ? (
              <p className="self-start text-[0.75rem] text-text-secondary">{t.aiThinking}</p>
            ) : null}
            <div ref={end} />
          </div>
        ) : null}

        <form onSubmit={(e) => void send(e)} className="flex items-start gap-2">
          <div className="flex-1">
            <Field
              autoFocus
              value={prompt}
              maxLength={1000}
              placeholder={t.aiPlaceholder}
              aria-label={t.aiPlaceholder}
              hint={log.length ? undefined : t.aiHint}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            compact
            icon="sparkle"
            label={t.aiSend}
            loading={busy}
            disabled={!prompt.trim()}
          />
        </form>
      </div>
    </Sheet>
  );
}

const PREVIEW_W = 320;
const PREVIEW_H = 200;
const PAD = 12;

/** The drawing as it will look, scaled to fit a card — the same `paintBoard` the board uses. */
function Preview({ elements }: { elements: BoardElement[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bounds = useMemo(() => contentBounds(elements), [elements]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !bounds) return;
    const scale = Math.min(
      1,
      (PREVIEW_W - PAD * 2) / Math.max(1, bounds.width),
      (PREVIEW_H - PAD * 2) / Math.max(1, bounds.height),
    );
    const width = Math.round(bounds.width * scale + PAD * 2);
    const height = Math.round(bounds.height * scale + PAD * 2);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBoard(ctx, {
      elements,
      camera: { x: PAD - bounds.x * scale, y: PAD - bounds.y * scale, scale },
      width,
      height,
      smooth: true,
      grid: false,
      background: '#FFFFFF',
      onImageReady: () => {},
    });
  }, [elements, bounds]);

  return <canvas ref={ref} className="block max-w-full rounded-lg border border-line" />;
}
