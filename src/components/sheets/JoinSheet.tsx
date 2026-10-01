/**
 * "Join with a code": the six characters of a board's code, or a link to it.
 *
 * The code is six boxes over one invisible input, so the keyboard, paste and
 * autofill all work as they do on any input while the boxes show the code
 * character by character. A pasted link goes straight through `parseBoardRef`;
 * the sixth character opens the board.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useT } from '../../features/i18n';
import { resolveShortCode } from '../../lib/api';
import { parseBoardRef } from '../../lib/deep-link';
import { SHORT_CODE_LENGTH, normalizeShortCode } from '../../lib/short-code';
import { toast } from '../../lib/toast';

import { Sheet } from '../ui/Sheet';

export function JoinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function join(raw: string) {
    const ref = parseBoardRef(raw);
    if (!ref) {
      toast(t.errCodeInvalid);
      return;
    }
    setBusy(true);
    try {
      const boardId = ref.kind === 'id' ? ref.boardId : await resolveShortCode(ref.shortCode);
      setCode('');
      onClose();
      navigate(`/board/${boardId}`);
    } catch (error) {
      setCode('');
      toast(error instanceof Error ? error.message : t.errJoin);
    } finally {
      setBusy(false);
    }
  }

  /** Characters fill the boxes; a link or an id skips them and joins at once. */
  function onChange(raw: string) {
    if (busy) return;
    if (raw.includes('/') || raw.includes(':')) {
      void join(raw);
      return;
    }
    const next = normalizeShortCode(raw).slice(0, SHORT_CODE_LENGTH);
    setCode(next);
    if (next.length === SHORT_CODE_LENGTH) void join(next);
  }

  return (
    <Sheet open={open} title={t.joinWhiteboard} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-2 pb-1">
        {/* The boxes are a picture of the input; the input itself is the thing
            with focus, so paste and autofill just work. */}
        <div
          className={`relative flex justify-between gap-1.5 transition-opacity ${busy ? 'opacity-60' : ''}`}
          onClick={() => input.current?.focus()}
        >
          {Array.from({ length: SHORT_CODE_LENGTH }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`grid h-[52px] flex-1 place-items-center rounded-[14px] border-[1.5px] font-mono text-[1.25rem] font-bold transition ${
                code.length === i ? 'border-accent bg-background' : 'border-field bg-glass-solid'
              }`}
            >
              {code[i] ?? ''}
            </span>
          ))}
          <input
            ref={input}
            autoFocus
            value={code}
            onChange={(e) => onChange(e.target.value)}
            aria-label={t.joinCode}
            autoCapitalize="characters"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            disabled={busy}
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
        </div>
        <p className="text-[0.75rem] leading-snug text-text-secondary">{t.joinCodeHint}</p>
      </div>
    </Sheet>
  );
}
