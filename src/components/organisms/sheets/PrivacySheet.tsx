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
import { useT } from '../../../features/i18n';
import { generatePin, useBoardPermissions } from '../../../features/permissions';
import { useBoardStore } from '../../../features/board-store';
import type { BoardAccess, EditPolicy } from '../../../lib/contract';

import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Segmented } from '../../atoms/Segmented';
import { RowChevron, SectionLabel, Sheet, SheetGroup, SheetRow } from '../../molecules/Sheet';

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
        <div className="flex flex-col gap-1.5">
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
          <p className="px-3 text-[0.75rem] leading-snug text-text-secondary">{t.visibilityHint}</p>
        </div>

        {isPrivate ? (
          <div className="flex min-h-11 items-center gap-3 rounded-[12px] bg-glass-row px-3 py-1.5">
            <Icon name="lock" size={19} className="flex-none text-accent-text" />
            <div className="min-w-0 flex-1">
              <div className="text-[0.9375rem] leading-tight">{t.pinLabel}</div>
              {!knownPin ? (
                <div className="mt-0.5 text-[0.75rem] leading-snug text-text-secondary">{t.pinHidden}</div>
              ) : null}
            </div>
            <span className="font-mono text-[1rem] font-bold tracking-[3px]">{knownPin ?? '••••'}</span>
            {isCreator ? (
              <Button label={t.newPin} variant="secondary" compact disabled={busy} onClick={() => void apply({ pin: generatePin() })} />
            ) : null}
          </div>
        ) : null}

        {/* One list, one tick: the row that is on carries the checkmark. */}
        <div role="radiogroup" aria-label={t.whoEdits}>
          <SheetGroup title={t.whoEdits} footer={isCreator ? undefined : t.ownerOnlyHint}>
            {modes.map((mode) => {
              const active = meta.editPolicy === mode.id;
              return (
                <SheetRow
                  key={mode.id}
                  role="radio"
                  aria-checked={active}
                  ariaLabel={`${mode.label}. ${mode.desc}`}
                  title={mode.label}
                  description={mode.desc}
                  disabled={!isCreator || busy}
                  onClick={() => void apply({ editPolicy: mode.id })}
                  right={active ? <Icon name="check" size={17} className="flex-none text-accent-text" /> : null}
                />
              );
            })}
            {meta.editPolicy === 'selected' ? (
              <SheetRow title={t.chooseEditors} tone="accent" right={<RowChevron />} onClick={onOpenPeople} />
            ) : null}
          </SheetGroup>
        </div>
      </div>
    </Sheet>
  );
}
