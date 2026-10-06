/**
 * The header's "+": another whiteboard — a blank one, named here, or one
 * someone else made, joined with its code.
 *
 * The code is six characters of a board's code, or a link to it.
 * The code is six boxes over one invisible input, so the keyboard, paste and
 * autofill all work as they do on any input while the boxes show the code
 * character by character. A pasted link goes straight through `parseBoardRef`;
 * the sixth character opens the board.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useT } from '../../features/i18n';
import { LIMITS } from '../../lib/contract';
import { resolveShortCode } from '../../lib/api';
import { parseBoardRef } from '../../lib/deep-link';
import { SHORT_CODE_LENGTH, normalizeShortCode } from '../../lib/short-code';
import { toast } from '../../lib/toast';

import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { SectionLabel, Sheet } from '../ui/Sheet';

export function JoinSheet({
  open,
  onClose,
  onCreate,
  creating,
}: {
  open: boolean;
  onClose: () => void;
  /** Makes a blank whiteboard with this name (empty: the default name) and opens it. */
  onCreate: (name: string) => void;
  creating: boolean;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [name, setName] = useState('');
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
    <Sheet open={open} title={t.anotherWhiteboard} onClose={onClose} closeLabel={t.close}>
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(name.trim());
          setName('');
        }}
      >
        <SectionLabel>{t.newWhiteboard}</SectionLabel>
        <Field
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, LIMITS.maxBoardNameLength))}
          placeholder={t.boardNamePlaceholder}
          aria-label={t.boardName}
        />
        <Button type="submit" label={t.createBoard} icon="plus" loading={creating} fullWidth />
      </form>

      <div className="mt-5 flex flex-col gap-2 pb-1">
        <SectionLabel>{t.joinWhiteboard}</SectionLabel>
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
