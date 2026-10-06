/**
 * `/`: there is no home page. The app always opens on this browser's offline
 * board (mobile/docs/plans/34), made the first time — it needs no network, so
 * there is always something to draw on at once. Only where the browser keeps
 * no storage does it fall back to the whiteboard the user was last at, or a
 * new live one.
 *
 * Everything a home page used to offer (a new board, an old one, a code, a
 * file, the settings) is a button on the whiteboard itself.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { useT } from '../features/i18n';
import { useSessionStore } from '../features/session';
import { createBoard } from '../lib/api';
import { ensureLocal } from '../features/board-local';

export default function StartPage() {
  const navigate = useNavigate();
  const t = useT();
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const live = () => {
      const { recent, userId } = useSessionStore.getState();
      // The last one opened; if it turns out to be gone the board page lets go
      // of it and comes back here for the next.
      if (recent[0]) {
        navigate(`/board/${recent[0].id}`, { replace: true });
        return;
      }
      createBoard({ name: t.newBoardName, access: 'public', editPolicy: 'everyone', creatorId: userId }).then(
        (meta) => {
          if (!cancelled) navigate(`/board/${meta.id}`, { replace: true });
        },
        (error) => {
          if (!cancelled) setFailed(error instanceof Error ? error.message : t.errCreate);
        },
      );
    };
    ensureLocal(t.localBoardName).then(
      (board) => {
        if (!cancelled) navigate(`/board/${board.id}`, { replace: true });
      },
      () => {
        if (!cancelled) live();
      },
    );
    return () => {
      cancelled = true;
    };
    // `t` is stable per language and only names the board.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, navigate]);

  if (failed) {
    return (
      <main className="relative h-full">
        <Backdrop variant="home" />
        <div className="relative flex h-full flex-col items-center justify-center gap-3.5 p-7 text-center">
          <h1 className="text-[1.25rem] leading-tight font-extrabold tracking-[-0.4px]">{t.errCreate}</h1>
          <p className="text-[0.8125rem] leading-relaxed text-text-secondary">{failed}</p>
          <Button
            label={t.retry}
            variant="secondary"
            onClick={() => {
              setFailed(null);
              setAttempt((n) => n + 1);
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="grid h-full place-items-center bg-background">
      <div className="sb-loading" role="status" aria-label={t.loading} />
      <p className="sb-late text-[0.8125rem] font-semibold text-text-tertiary">{t.loading}</p>
    </main>
  );
}
