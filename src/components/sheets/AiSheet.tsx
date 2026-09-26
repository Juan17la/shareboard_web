/**
 * "Draw with AI": a small chat. Each message is drawn by the server (see
 * server/src/ai.ts) centred on what this screen is looking at, and the
 * elements arrive over the socket like anyone else's — so this sheet only
 * keeps the log. Each prompt is independent: the model does not see the board.
 */
import { useRef, useState, type FormEvent } from 'react';

import { fill, useT } from '../../features/i18n';
import { screenToBoard, useBoardStore } from '../../features/board-store';
import { useSessionStore } from '../../features/session';
import { drawWithAi } from '../../lib/api';

import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Sheet } from '../ui/Sheet';

interface Message {
  from: 'you' | 'ai' | 'error';
  text: string;
}

export function AiSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const userId = useSessionStore((s) => s.userId);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Message[]>([]);
  const end = useRef<HTMLDivElement>(null);

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
      const res = await drawWithAi(meta.id, text, at, { userId, token: boardToken ?? '' });
      push({
        from: 'ai',
        text: [res.reply, fill(t.aiAdded, { N: String(res.added) })].join(' ').trim(),
      });
    } catch (err) {
      push({ from: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} title={t.sheetAi} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-3">
        {log.length ? (
          <div className="flex max-h-[34vh] flex-col gap-2 overflow-y-auto" aria-live="polite">
            {log.map((m, i) => (
              <p
                key={i}
                className={[
                  'max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-snug',
                  m.from === 'you'
                    ? 'self-end bg-accent text-white'
                    : m.from === 'error'
                      ? 'self-start bg-danger-soft text-danger'
                      : 'self-start bg-surface-selected',
                ].join(' ')}
              >
                {m.text}
              </p>
            ))}
            {busy ? (
              <p className="self-start text-[12px] text-text-secondary">{t.aiThinking}</p>
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
