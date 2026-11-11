/**
 * "Connected": who is on the board, and — for the creator — one click to grant
 * or revoke their editing.
 *
 * The pill on the right is the whole control. Clicking it moves the board to
 * the `selected` policy and puts that person on (or off) the list, which is the
 * design's shortcut for the common case: you do not want to open an access
 * panel and reason about policies, you want to let *this* person draw.
 */
import { useT } from '../../../features/i18n';
import { useBoardPermissions } from '../../../features/permissions';
import { useSessionStore } from '../../../features/session';
import { useBoardStore } from '../../../features/board-store';

import { Avatar } from '../../atoms/Avatar';
import { Sheet, SheetGroup, SheetRow } from '../../molecules/Sheet';

export function PeopleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const meta = useBoardStore((s) => s.meta);
  const participants = useBoardStore((s) => s.participants);
  const userId = useSessionStore((s) => s.userId);
  const { isCreator, busy, apply } = useBoardPermissions();

  const toggleEditor = (target: string, currentlyListed: boolean) => {
    if (!meta || busy) return;
    const editors = currentlyListed
      ? meta.editors.filter((id) => id !== target)
      : [...meta.editors, target];
    // Granting one person implies the `selected` policy — under `everyone` the
    // pill would be meaningless, and under `creator-only` it would do nothing.
    void apply({ editPolicy: 'selected', editors });
  };

  return (
    <Sheet open={open} title={t.sheetPeople} onClose={onClose} closeLabel={t.close}>
      {participants.length === 0 ? (
        <p className="px-3 py-4 text-center text-[0.8125rem] leading-snug text-text-secondary">{t.aloneHere}</p>
      ) : (
        <SheetGroup footer={isCreator ? t.peopleHint : t.ownerOnlyHint}>
          {participants.map((p) => {
            const isOwner = p.userId === meta?.creatorId;
            const isYou = p.userId === userId;
            const canEdit = p.role !== 'viewer';
            const listed = meta?.editors.includes(p.userId) ?? false;
            const pill = isOwner ? t.pillOwner : canEdit ? t.pillCan : t.pillCannot;

            return (
              <SheetRow
                key={p.userId}
                title={`${p.nickname}${isYou && !isOwner ? ` · ${t.roleYou}` : ''}`}
                description={isOwner ? (isYou ? t.roleOwner : t.roleOwnerOther) : t.roleGuest}
                left={<Avatar name={p.nickname} color={p.color} avatar={p.avatar} size={32} />}
                right={
                  <button
                    type="button"
                    aria-label={`${p.nickname}: ${pill}`}
                    aria-pressed={canEdit}
                    disabled={isOwner || !isCreator || busy}
                    onClick={() => toggleEditor(p.userId, listed)}
                    className={`touch-36 min-h-7 flex-none rounded-full px-3 text-[0.8125rem] font-semibold transition-colors disabled:cursor-default ${
                      canEdit ? 'bg-accent-soft text-accent-text' : 'bg-fill text-text-secondary'
                    } ${isCreator || isOwner ? '' : 'opacity-70'}`}
                  >
                    {pill}
                  </button>
                }
              />
            );
          })}
        </SheetGroup>
      )}
    </Sheet>
  );
}
