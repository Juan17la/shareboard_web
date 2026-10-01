/**
 * "My whiteboards": the boards this browser has opened, newest first. Picking
 * one goes there; the cross takes it off the list (it does not delete it).
 */
import { useNavigate } from 'react-router-dom';

import { relativeTime, useT } from '../../features/i18n';
import { useSessionStore } from '../../features/session';
import { formatShortCode } from '../../lib/short-code';
import { toast } from '../../lib/toast';

import { Avatar } from '../ui/Avatar';
import { GlassPanel } from '../ui/Glass';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';

export function BoardsSheet({
  open,
  onClose,
  currentId,
}: {
  open: boolean;
  onClose: () => void;
  /** The board on screen: marked, and not offered as somewhere to go. */
  currentId: string;
}) {
  const t = useT();
  const navigate = useNavigate();
  const recent = useSessionStore((s) => s.recent);
  const nickColor = useSessionStore((s) => s.nickColor);
  const forgetBoard = useSessionStore((s) => s.forgetBoard);

  return (
    <Sheet open={open} title={t.myWhiteboards} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-2 pb-1">
        {recent.length === 0 ? (
          <p className="py-6 text-center text-[0.7812rem] leading-snug text-text-secondary">{t.noRecent}</p>
        ) : (
          recent.map((board) => (
            <GlassPanel key={board.id} level="row" radius={16}>
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label={`${board.name}, ${board.shortCode}`}
                  aria-current={board.id === currentId ? 'true' : undefined}
                  onClick={() => {
                    onClose();
                    if (board.id !== currentId) navigate(`/board/${board.id}`);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 text-left transition hover:bg-surface-selected"
                >
                  <Avatar name={board.name} color={nickColor} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8438rem] leading-tight font-bold">{board.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[0.75rem] text-text-secondary">
                      {formatShortCode(board.shortCode)} · {relativeTime(t, board.lastOpenedAt)}
                    </span>
                  </span>
                  {board.id === currentId ? (
                    <span className="flex-none text-accent">
                      <Icon name="check" size={16} />
                    </span>
                  ) : null}
                </button>
                {board.id === currentId ? null : (
                  <button
                    type="button"
                    aria-label={t.forget}
                    data-tip={t.forget}
                    data-tip-side="left"
                    onClick={() => {
                      forgetBoard(board.id);
                      toast(t.forget);
                    }}
                    className="mr-2 grid h-9 w-9 flex-none place-items-center rounded-[11px] text-text-tertiary transition hover:bg-surface-selected hover:text-danger"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            </GlassPanel>
          ))
        )}
      </div>
    </Sheet>
  );
}
