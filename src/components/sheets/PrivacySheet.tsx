/**
 * "Editing access": who can open the board, and who can draw on it.
 *
 * Both halves of the access model from mobile/docs/01 live here — `access`
 * (public / private + PIN) and `editPolicy` (everyone / selected / creator
 * only) — and neither has a Save button: every change applies immediately and
 * the server broadcasts the result, so a viewer's tools appear or disappear
 * without anyone reloading.
 *
 * The PIN readout only ever shows a value this browser chose; a creator opening
 * their board on a second machine sees the masked form, because the PIN
 * genuinely is not recoverable from the server
 * (mobile/docs/02-backend-connection).
 */
import { useT } from '../../features/i18n';
import { generatePin, useBoardPermissions } from '../../features/permissions';
import { useBoardStore } from '../../features/board-store';
import type { BoardAccess, EditPolicy } from '../../lib/contract';
import { Css } from '../../lib/theme';

import { GlassPanel } from '../ui/Glass';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';
import { SectionLabel, Sheet } from '../ui/Sheet';

export function PrivacySheet({
  open,
  onClose,
  onOpenPeople,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPeople: () => void;
}) {
  const t = useT();
  const meta = useBoardStore((s) => s.meta);
  const { isCreator, busy, knownPin, apply } = useBoardPermissions();

  if (!open || !meta) return null;

  const isPrivate = meta.access === 'private';

  const modes: { id: EditPolicy; label: string; desc: string }[] = [
    { id: 'everyone', label: t.modeAll, desc: t.modeAllDesc },
    { id: 'selected', label: t.modeSome, desc: t.modeSomeDesc },
    { id: 'creator-only', label: t.modeMe, desc: t.modeMeDesc },
  ];

  const setVisibility = (next: BoardAccess) => {
    if (next === meta.access) return;
    // Going private needs a PIN to go with it; there is nothing to ask the user
    // that they would answer better than a random four digits they can read off
    // the panel a moment later.
    void apply(
      next === 'private'
        ? { access: 'private', pin: generatePin() }
        : { access: 'public', pin: null },
    );
  };

  return (
    <Sheet open={open} title={t.sheetPrivacy} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <SectionLabel>{t.visibility}</SectionLabel>
          <Segmented
            label={t.visibility}
            value={meta.access}
            onChange={setVisibility}
            disabled={!isCreator || busy}
            options={[
              { value: 'public' as BoardAccess, label: t.publicLabel },
              { value: 'private' as BoardAccess, label: t.privateLabel },
            ]}
          />
          <p className="text-[0.75rem] leading-snug text-text-secondary">{t.visibilityHint}</p>
        </div>

        {isPrivate ? (
          <GlassPanel level="row" radius={16}>
            <div className="flex items-center gap-2.5 p-3.5">
              <Icon name="lock" size={18} />
              <div className="min-w-0 flex-1">
                <div className="text-[0.8125rem] leading-tight font-bold">{t.pinLabel}</div>
                {!knownPin ? (
                  <div className="text-[0.75rem] leading-snug text-text-secondary">{t.pinHidden}</div>
                ) : null}
              </div>
              <span className="font-mono text-[1rem] font-bold tracking-[3px]">
                {knownPin ?? '••••'}
              </span>
              {isCreator ? (
                <button
                  type="button"
                  aria-label={t.newPin}
                  disabled={busy}
                  onClick={() => void apply({ pin: generatePin() })}
                  className="flex-none rounded-[11px] border border-line-strong bg-surface px-2.5 py-[7px] text-[0.75rem] font-extrabold text-text-secondary transition hover:bg-surface-selected disabled:opacity-50"
                >
                  {t.newPin}
                </button>
              ) : null}
            </div>
          </GlassPanel>
        ) : null}

        <div className="flex flex-col gap-2">
          <SectionLabel>{t.whoEdits}</SectionLabel>
          <div role="radiogroup" aria-label={t.whoEdits} className="flex flex-col gap-2">
            {modes.map((mode) => {
              const active = meta.editPolicy === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${mode.label}. ${mode.desc}`}
                  disabled={!isCreator || busy}
                  onClick={() => void apply({ editPolicy: mode.id })}
                  className="flex items-center gap-3 rounded-[15px] border px-3.5 py-3 text-left transition disabled:cursor-default"
                  style={{
                    borderColor: active ? Css.accent : Css.border,
                    background: active ? Css.accentSofter : 'var(--color-glass-solid)',
                    opacity: isCreator ? 1 : 0.75,
                  }}
                >
                  <span
                    className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full"
                    style={{ border: `1.5px solid ${active ? Css.accent : Css.borderDashed}` }}
                  >
                    {active ? (
                      <span className="h-2 w-2 rounded-full" style={{ background: Css.accent }} />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.8438rem] leading-tight font-bold">
                      {mode.label}
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] leading-snug text-text-secondary">
                      {mode.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {meta.editPolicy === 'selected' ? (
            <button
              type="button"
              aria-label={t.chooseEditors}
              onClick={onOpenPeople}
              className="flex items-center justify-between gap-2 rounded-[14px] border px-3.5 py-3 transition hover:brightness-95"
              style={{ borderColor: Css.accent, background: Css.accentSofter }}
            >
              <span className="text-[0.7812rem] font-extrabold text-accent-text">{t.chooseEditors}</span>
              <span className="text-accent-text">
                <Icon name="chevron" size={15} />
              </span>
            </button>
          ) : null}

          {!isCreator ? (
            <p className="text-[0.75rem] leading-snug text-text-secondary">{t.ownerOnlyHint}</p>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
