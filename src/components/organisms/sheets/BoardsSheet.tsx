/**
 * "My whiteboards": the offline board first, then the live boards — for an
 * account, every board it made or has got into, from the server, on any
 * device; for a guest, the ones this browser has opened. Newest first. Picking
 * one goes there (a private one the account got into opens without its PIN);
 * the cross takes it off the list (it does not delete it).
 *
 * The live ones are only offered while they can be reached (plans/34): hidden
 * once the server has not been heard from in five hours, back as soon as it
 * answers again.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { relativeTime, useT } from '../../../features/i18n';
import { useSessionStore } from '../../../features/session';
import { checkOnline, isLocalId, recentlyOnline } from '../../../features/board-local';
import { forgetMyBoard, getMyBoards, type MyBoard } from '../../../lib/api';
import { formatShortCode } from '../../../lib/short-code';
import { toast } from '../../../lib/toast';

import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { Sheet, SheetGroup } from '../../molecules/Sheet';

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
  const signedIn = useSessionStore((s) => s.account !== null);
  const [live, setLive] = useState(recentlyOnline);
  // The account's boards, fetched each time the sheet opens; null until they arrive.
  const [mine, setMine] = useState<MyBoard[] | null>(null);
  const [mineFailed, setMineFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    void checkOnline().then((ok) => setLive(ok || recentlyOnline()));
    if (!signedIn) return;
    let cancelled = false;
    getMyBoards().then(
      (boards) => {
        if (cancelled) return;
        setMine(boards);
        setMineFailed(false);
      },
      () => {
        if (!cancelled) setMineFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, signedIn]);

  const rows = signedIn
    ? (mine ?? []).map((b) => ({ ...b, at: b.updatedAt, yours: b.role === 'creator' }))
    : recent.map((b) => ({ ...b, at: b.lastOpenedAt, yours: true, hasPin: false }));
  const forget = (id: string) => {
    forgetBoard(id);
    toast(t.forget);
    if (!signedIn) return;
    setMine((list) => list?.filter((b) => b.id !== id) ?? null);
    forgetMyBoard(id).catch((error: Error) => toast(error.message));
  };

  return (
    <Sheet open={open} title={t.myWhiteboards} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-4 pb-1">
        <SheetGroup>
          <button
            type="button"
            aria-label={t.localBoardName}
            aria-current={isLocalId(currentId) ? 'true' : undefined}
            onClick={() => {
              onClose();
              if (!isLocalId(currentId)) navigate('/');
            }}
            className="flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-fill active:bg-fill-strong"
          >
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-fill">
              <Icon name="pencil" size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] leading-tight">{t.localBoardName}</span>
              <span className="mt-0.5 block truncate text-[0.75rem] text-text-secondary">{t.localRow}</span>
            </span>
            {isLocalId(currentId) ? (
              <span className="flex-none text-accent-text">
                <Icon name="check" size={16} />
              </span>
            ) : null}
          </button>
        </SheetGroup>
        {!live || (signedIn && mineFailed && mine === null) ? (
          <p className="py-6 text-center text-[0.8125rem] leading-snug text-text-secondary">{t.liveHidden}</p>
        ) : signedIn && mine === null ? (
          <div className="grid place-items-center py-6">
            <div className="sb-loading" role="status" aria-label={t.loading} />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-[0.8125rem] leading-snug text-text-secondary">
            {signedIn ? t.myBoardsEmpty : t.noRecent}
          </p>
        ) : (
          <SheetGroup>
          {rows.map((board) => (
              <div key={board.id} className="flex items-center">
                <button
                  type="button"
                  aria-label={`${board.name}, ${board.shortCode}`}
                  aria-current={board.id === currentId ? 'true' : undefined}
                  onClick={() => {
                    onClose();
                    if (board.id !== currentId) navigate(`/board/${board.id}`);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-fill active:bg-fill-strong"
                >
                  <Avatar name={board.name} color={nickColor} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] leading-tight">{board.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-[0.75rem] text-text-secondary">
                      {board.hasPin ? (
                        <span aria-label={t.privateBoard}>
                          <Icon name="lock" size={12} />
                        </span>
                      ) : null}
                      <span className="font-mono">{formatShortCode(board.shortCode)}</span>
                      <span>· {relativeTime(t, board.at)}</span>
                      {signedIn && board.yours ? <span>· {t.boardYours}</span> : null}
                    </span>
                  </span>
                  {board.id === currentId ? (
                    <span className="flex-none text-accent-text">
                      <Icon name="check" size={16} />
                    </span>
                  ) : null}
                </button>
                {/* The account's own boards are deleted from their settings, not forgotten. */}
                {board.id === currentId || (signedIn && board.yours) ? null : (
                  <button
                    type="button"
                    aria-label={t.forget}
                    data-tip={t.forget}
                    data-tip-side="left"
                    onClick={() => forget(board.id)}
                    className="touch-36 mr-1.5 grid h-8 w-8 flex-none place-items-center rounded-full text-text-tertiary transition-colors hover:bg-fill hover:text-danger"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
          ))}
          </SheetGroup>
        )}
      </div>
    </Sheet>
  );
}
