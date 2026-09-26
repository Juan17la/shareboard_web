/**
 * Other people's cursors, floating over the board with their names attached.
 *
 * These sit in a DOM layer above the canvas rather than being painted into it.
 * A cursor is a pointer plus a name label, and the labels have to stay a
 * constant size however far the board is zoomed out, so they were never going
 * to live in board space; a div also gets the app's own typography for free.
 */
import { boardToScreen, useBoardStore, type Camera } from '../../features/board-store';
import { useSessionStore } from '../../features/session';

export function PeerCursors({ camera }: { camera: Camera }) {
  const participants = useBoardStore((s) => s.participants);
  const you = useBoardStore((s) => s.you);
  const show = useSessionStore((s) => s.settings.peers);

  if (!show) return null;

  const peers = participants.filter((p) => p.userId !== you?.userId && p.cursor);
  if (peers.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {peers.map((p) => {
        const at = boardToScreen(p.cursor!.x, p.cursor!.y, camera);
        return (
          <div
            key={p.userId}
            className="absolute flex items-start gap-0.5"
            style={{ left: 0, top: 0, transform: `translate(${at.x}px, ${at.y}px)` }}
          >
            {/* A teardrop: three round corners and one sharp one, tipped
                slightly so it reads as a pointer rather than as a dot. */}
            <span
              className="h-3 w-3 shadow-[0_1px_4px_rgba(0,0,0,0.25)]"
              style={{
                background: p.color,
                borderRadius: '50% 50% 50% 2px',
                transform: 'rotate(-8deg)',
              }}
            />
            <span
              className="rounded-full px-[7px] py-0.5 text-[10px] leading-[1.3] font-bold whitespace-nowrap text-white"
              style={{ background: p.color }}
            >
              {p.nickname}
            </span>
          </div>
        );
      })}
    </div>
  );
}
