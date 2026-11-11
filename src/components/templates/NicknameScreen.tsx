/**
 * "What should we call you?" — the identity step before a board opens.
 *
 * This name and icon are the user as far as the board is concerned: they label
 * the cursor other people watch move and the avatar in the header. Both are
 * remembered per browser, so a returning user sees their own name already
 * filled in and one click gets them through. The first time — joining or
 * sharing a live board, or making an account — it starts empty rather than on
 * the stand-in guest name.
 */
import { useState } from 'react';

import { useT } from '../../features/i18n';
import { useSessionStore } from '../../features/session';
import { LIMITS } from '../../lib/contract';
import { Avatars } from '../../lib/theme';

import { Avatar } from '../atoms/Avatar';
import { Backdrop } from '../atoms/Backdrop';
import { Button } from '../atoms/Button';
import { Field } from '../atoms/Field';
import { SectionLabel } from '../molecules/Sheet';

export function NicknameScreen({
  error,
  onContinue,
  onCancel,
  blank = false,
}: {
  /** Set when the last attempt came back `NICKNAME_TAKEN`. */
  error?: string | null;
  onContinue: (nickname: string) => void;
  /** Shows a Cancel button: the step was asked for on the way to something else. */
  onCancel?: () => void;
  /** Start with an empty field instead of the stored name. */
  blank?: boolean;
}) {
  const t = useT();
  const storedNickname = useSessionStore((s) => s.nickname);
  const nickColor = useSessionStore((s) => s.nickColor);
  const avatar = useSessionStore((s) => s.avatar);

  const [draft, setDraft] = useState(blank ? '' : storedNickname);
  const ready = draft.trim().length > 0;

  return (
    <main className="relative h-full overflow-hidden">
      <Backdrop />
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-4 py-6">
        <div
          className="sb-dialog w-full max-w-[400px] overflow-hidden rounded-[18px] bg-sheet shadow-panel"
          style={{ maxHeight: 'calc(100% - 16px)' }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ready) onContinue(draft.trim());
            }}
            className="no-scrollbar flex max-h-[calc(100vh-48px)] flex-col gap-4 overflow-y-auto px-4 pb-4 pt-5"
          >
            <div className="flex flex-col gap-1 px-3">
              <h1 className="text-[1.375rem] leading-[1.15] font-bold tracking-[-0.02em]">
                {t.nickTitle}
              </h1>
              <p className="text-[0.875rem] leading-snug text-text-secondary">{t.nickSub}</p>
            </div>

            <div className="sb-focus-row rounded-[12px] bg-glass-row transition-shadow">
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar name={draft || '?'} color={nickColor} avatar={avatar} size={36} />
                <div className="min-w-0 flex-1">
                  <Field
                    bare
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.trimStart().slice(0, LIMITS.maxNicknameLength))}
                    placeholder={t.nickPlaceholder}
                    autoFocus={blank || !storedNickname}
                    autoComplete="nickname"
                    aria-label={t.nickPlaceholder}
                    className="!text-[1rem]"
                  />
                </div>
              </div>
            </div>

            {error ? <p role="alert" className="-mt-2 px-3 text-[0.8125rem] font-medium text-danger">{error}</p> : null}

            <div className="flex flex-col gap-1.5">
              {/* One choice, not two: every icon brings its own colour. */}
              <SectionLabel>{t.yourIcon}</SectionLabel>
              <div className="rounded-[12px] bg-glass-row p-2">
                <AvatarPicker name={draft} />
              </div>
            </div>

            <Button
              label={t.continue}
              type="submit"
              disabled={!ready}
              fullWidth
              onClick={() => ready && onContinue(draft.trim())}
            />
            {onCancel ? (
              <Button label={t.cancel} variant="ghost" fullWidth onClick={onCancel} />
            ) : null}
          </form>
        </div>
      </div>
    </main>
  );
}

/** The icon grid: one choice, not two, since every icon brings its own colour. */
export function AvatarPicker({ name }: { name: string }) {
  const t = useT();
  const avatar = useSessionStore((s) => s.avatar);
  const setAvatar = useSessionStore((s) => s.setAvatar);
  return (
    <div role="radiogroup" aria-label={t.yourIcon} className="flex flex-wrap gap-0.5">
      {Avatars.map(({ icon, color }) => {
        const active = avatar === icon;
        return (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={icon}
            onClick={() => setAvatar(icon)}
            className="grid h-11 w-11 place-items-center rounded-full transition-shadow"
            style={{ boxShadow: active ? `inset 0 0 0 2px ${color}` : undefined }}
          >
            <Avatar name={name || '?'} color={color} avatar={icon} size={34} />
          </button>
        );
      })}
    </div>
  );
}
