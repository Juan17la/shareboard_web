/**
 * "What should we call you?" — the identity step before a board opens.
 *
 * There are no accounts, so this name and icon *are* the user as far as the
 * board is concerned: they label the cursor other people watch move and the
 * avatar in the header. Both are remembered per browser, so a returning user
 * sees their own name already filled in and one click gets them through.
 */
import { useState } from 'react';

import { useT } from '../../features/i18n';
import { useSessionStore } from '../../features/session';
import { LIMITS } from '../../lib/contract';
import { Avatars } from '../../lib/theme';

import { Avatar } from '../ui/Avatar';
import { Backdrop } from '../ui/Backdrop';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { GlassPanel } from '../ui/Glass';
import { SectionLabel } from '../ui/Sheet';

export function NicknameScreen({
  error,
  onContinue,
}: {
  /** Set when the last attempt came back `NICKNAME_TAKEN`. */
  error?: string | null;
  onContinue: (nickname: string) => void;
}) {
  const t = useT();
  const storedNickname = useSessionStore((s) => s.nickname);
  const nickColor = useSessionStore((s) => s.nickColor);
  const avatar = useSessionStore((s) => s.avatar);

  const [draft, setDraft] = useState(storedNickname);
  const ready = draft.trim().length > 0;

  return (
    <main className="relative h-full overflow-hidden">
      <Backdrop variant="nickname" />
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-4 py-6">
        <GlassPanel
          level="panel"
          radius={26}
          className="sb-dialog w-full max-w-[460px] shadow-panel"
          style={{ maxHeight: 'calc(100% - 16px)' }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ready) onContinue(draft.trim());
            }}
            className="no-scrollbar flex max-h-[calc(100vh-48px)] flex-col gap-6 overflow-y-auto px-5 pb-5 pt-6 sm:px-6"
          >
            <div className="flex flex-col gap-2">
              <h1 className="text-[1.5rem] leading-[1.15] font-extrabold tracking-[-0.5px]">
                {t.nickTitle}
              </h1>
              <p className="text-[0.8438rem] leading-relaxed text-text-secondary">{t.nickSub}</p>
            </div>

            <GlassPanel level="row" radius={20} className="sb-focus-row">
              <div className="flex items-center gap-3 p-3.5">
                <Avatar name={draft || '?'} color={nickColor} avatar={avatar} size={46} />
                <div className="min-w-0 flex-1">
                  <Field
                    bare
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.trimStart().slice(0, LIMITS.maxNicknameLength))}
                    placeholder={t.nickPlaceholder}
                    autoFocus={!storedNickname}
                    autoComplete="nickname"
                    aria-label={t.nickPlaceholder}
                    className="!text-[1.0625rem]"
                  />
                </div>
              </div>
            </GlassPanel>

            {error ? <p className="text-[0.7812rem] font-semibold text-danger">{error}</p> : null}

            <div className="flex flex-col gap-2.5">
              {/* One choice, not two: every icon brings its own colour. */}
              <SectionLabel>{t.yourIcon}</SectionLabel>
              <AvatarPicker name={draft} />
            </div>

            <Button
              label={t.continue}
              type="submit"
              disabled={!ready}
              fullWidth
              onClick={() => ready && onContinue(draft.trim())}
            />
          </form>
        </GlassPanel>
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
    <div role="radiogroup" aria-label={t.yourIcon} className="-ml-1 flex flex-wrap gap-1">
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
            className="grid h-[46px] w-[46px] place-items-center rounded-full border-2 transition"
            style={{ borderColor: active ? color : 'transparent' }}
          >
            <Avatar name={name || '?'} color={color} avatar={icon} size={36} />
          </button>
        );
      })}
    </div>
  );
}
