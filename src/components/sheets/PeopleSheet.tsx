/**
 * "Connected": who is on the board, and — for the creator — one click to grant
 * or revoke their editing.
 *
 * The pill on the right is the whole control. Clicking it moves the board to
 * the `selected` policy and puts that person on (or off) the list, which is the
 * design's shortcut for the common case: you do not want to open an access
 * panel and reason about policies, you want to let *this* person draw.
 */
import { useT } from '../../features/i18n';
import { useBoardPermissions } from '../../features/permissions';
import { useSessionStore } from '../../features/session';
import { useBoardStore } from '../../features/board-store';
import { Css } from '../../lib/theme';

import { Avatar } from '../ui/Avatar';
import { GlassPanel } from '../ui/Glass';
import { Sheet } from '../ui/Sheet';

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
      <div className="flex flex-col gap-2">
        {participants.length === 0 ? (
          <p className="text-[0.7812rem] leading-snug text-text-secondary">{t.aloneHere}</p>
        ) : null}

        {participants.map((p) => {
          const isOwner = p.userId === meta?.creatorId;
          const isYou = p.userId === userId;
          const canEdit = p.role !== 'viewer';
          const listed = meta?.editors.includes(p.userId) ?? false;
          const pill = isOwner ? t.pillOwner : canEdit ? t.pillCan : t.pillCannot;

          return (
            <GlassPanel key={p.userId} level="row" radius={16}>
              <div className="flex items-center gap-3 px-3.5 py-3">
                <Avatar name={p.nickname} color={p.color} avatar={p.avatar} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.8438rem] leading-tight font-bold">
                    {p.nickname}
                    {isYou && !isOwner ? ` · ${t.roleYou}` : ''}
                  </div>
                  <div className="text-[0.75rem] font-semibold text-text-secondary">
                    {isOwner ? (isYou ? t.roleOwner : t.roleOwnerOther) : t.roleGuest}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`${p.nickname}: ${pill}`}
                  aria-pressed={canEdit}
                  disabled={isOwner || !isCreator || busy}
                  onClick={() => toggleEditor(p.userId, listed)}
                  className="flex-none rounded-full border px-2.5 py-[7px] text-[0.75rem] font-extrabold transition disabled:cursor-default"
                  style={{
                    borderColor: canEdit ? 'transparent' : Css.borderStrong,
                    background: canEdit ? Css.accentSoft : Css.surface,
                    color: canEdit ? Css.accent : Css.textSecondary,
                    opacity: isCreator || isOwner ? 1 : 0.7,
                  }}
                >
                  {pill}
                </button>
              </div>
            </GlassPanel>
          );
        })}

        <p className="px-0.5 py-1 text-[0.75rem] leading-snug text-text-secondary">
          {isCreator ? t.peopleHint : t.ownerOnlyHint}
        </p>
      </div>
    </Sheet>
  );
}
