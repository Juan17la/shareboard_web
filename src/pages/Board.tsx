/**
 * The board screen.
 *
 * It owns three things the design keeps deliberately flat: the connection phase
 * (identity -> PIN -> live), which sheet is open, and which confirm dialog is
 * open. Everything else is a child — the canvas, the floating header, the tool
 * rail, the bottom controls — and every sheet is a component rendered right
 * here rather than a route, so the board stays visible underneath.
 *
 * `pickName` is a one-shot query param: set when a board was just created or
 * imported, it forces the identity step even for someone whose nickname is
 * already remembered. Creating a board is the moment to choose how you appear
 * on it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { BoardCanvas } from '../components/board/BoardCanvas';
import { ConnectionBanner } from '../components/board/ConnectionBanner';
import { BottomControls } from '../components/board/BottomControls';
import { Toolbar } from '../components/board/Toolbar';
import { BoardHeader } from '../components/header/BoardHeader';
import { NicknameScreen } from '../components/screens/NicknameScreen';
import { PinScreen } from '../components/screens/PinScreen';
import { ExportSheet } from '../components/sheets/ExportSheet';
import { ImportSheet } from '../components/sheets/ImportSheet';
import { MenuSheet } from '../components/sheets/MenuSheet';
import { PeopleSheet } from '../components/sheets/PeopleSheet';
import { PrivacySheet } from '../components/sheets/PrivacySheet';
import { SettingsSheet } from '../components/sheets/SettingsSheet';
import { ShareSheet } from '../components/sheets/ShareSheet';
import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ToastHost } from '../components/ui/Toast';
import { toast } from '../lib/toast';
import { fill, useT } from '../features/i18n';
import { useSessionStore } from '../features/session';
import { useBoardStore } from '../features/board-store';
import { useBoardSync } from '../hooks/use-board-sync';
import { deleteBoard, importSnapshot } from '../lib/api';
import type { BoardSnapshot } from '../lib/contract';
import { copyText } from '../lib/clipboard';
import { WEB_BASE_URL } from '../lib/config';
import { boardShareLink } from '../lib/deep-link';
import { Layout } from '../lib/theme';

import { useViewport } from '../hooks/use-viewport';
import { useShortcuts } from '../hooks/use-shortcuts';

type SheetName = 'share' | 'people' | 'privacy' | 'export' | 'import' | 'menu' | 'settings';
type ConfirmName = 'clear' | 'delete';

export default function BoardPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const t = useT();
  const { width, height } = useViewport();
  const compact = width < Layout.compactBreakpoint;
  // Same rule as the mobile app: in landscape the header collapses to one row
  // and the tool rail moves up to meet it.
  const landscape = width > height;

  const nickname = useSessionStore((s) => s.nickname);
  const forgetBoard = useSessionStore((s) => s.forgetBoard);
  const userId = useSessionStore((s) => s.userId);

  const meta = useBoardStore((s) => s.meta);
  const clearBoard = useBoardStore((s) => s.clearBoard);

  // Satisfied once the identity step has been passed for this board, either by
  // confirming a name or because there was never a reason to ask.
  const [identityDone, setIdentityDone] = useState(params.get('pickName') !== '1');
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [confirm, setConfirm] = useState<ConfirmName | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const sync = useBoardSync(id, { paused: !identityDone });
  // Keys belong to the board only while it is the thing on screen.
  useShortcuts(sync.phase === 'ready' && sheet === null && confirm === null);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) clearTimeout(copyTimer.current);
    },
    [],
  );

  const copyCode = useCallback(async () => {
    if (!meta) return;
    try {
      await copyText(meta.shortCode);
      setCodeCopied(true);
      toast(t.toastCopied);
      if (copyTimer.current !== null) clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      toast(t.errClipboard);
    }
  }, [meta, t]);

  const handleImportSnapshot = useCallback(
    async (snapshot: BoardSnapshot) => {
      // Always a new board, never a paste into this one — importing must not be
      // able to overwrite something other people are working on.
      const created = await importSnapshot(
        { ...snapshot, meta: { name: snapshot.meta.name || t.importedBoardName } },
        userId,
      );
      navigate(`/board/${created.id}?pickName=1`, { replace: true });
    },
    [navigate, t, userId],
  );

  async function runConfirm() {
    if (confirm === 'clear') {
      clearBoard();
      setConfirm(null);
      setSheet(null);
      toast(t.toastCleared);
      return;
    }

    if (confirm !== 'delete' || !meta) return;
    // The server drops the board and disconnects everyone else on it; only then
    // does this browser forget it and leave.
    setDeleting(true);
    try {
      await deleteBoard(meta.id, { userId, token: useBoardStore.getState().boardToken ?? '' });
    } catch (error) {
      toast(error instanceof Error ? error.message : t.errDelete);
      setDeleting(false);
      return;
    }
    forgetBoard(meta.id);
    setConfirm(null);
    setSheet(null);
    toast(t.toastDeleted);
    navigate('/', { replace: true });
  }

  // --- gates -------------------------------------------------------------

  if (sync.phase === 'need-nickname') {
    return (
      <NicknameScreen
        error={sync.error}
        onContinue={(name) => {
          sync.submitNickname(name);
          setIdentityDone(true);
        }}
      />
    );
  }

  if (sync.phase === 'need-pin') {
    return <PinScreen error={sync.error} onSubmit={sync.submitPin} />;
  }

  if (sync.phase === 'error') {
    return (
      <main className="relative h-full">
        <Backdrop variant="home" />
        <div className="relative flex h-full flex-col items-center justify-center gap-3.5 p-7 text-center">
          <h1 className="text-[20px] leading-tight font-extrabold tracking-[-0.4px]">
            {t.errOpen}
          </h1>
          {sync.error ? (
            <p className="text-[13px] leading-relaxed text-text-secondary">{sync.error}</p>
          ) : null}
          <Button
            label={t.back}
            icon="back"
            variant="secondary"
            onClick={() => navigate('/', { replace: true })}
          />
        </div>
      </main>
    );
  }

  if (sync.phase === 'loading' || !nickname) {
    return (
      <main className="grid h-full place-items-center bg-background">
        <p className="text-[13px] font-semibold text-text-secondary">{t.loading}</p>
      </main>
    );
  }

  // --- the board ----------------------------------------------------------

  const link = meta ? boardShareLink(WEB_BASE_URL, meta.shortCode) : '';
  const anyOverlay = sheet !== null || confirm !== null;
  // Just under the header, whichever shape it takes.
  const controlsTop = landscape ? (compact ? 62 : 76) : compact ? 108 : 128;

  return (
    <div className="relative h-full overflow-hidden bg-background">
      <BoardCanvas onCursorMove={sync.sendCursor} />

      <BoardHeader
        compact={compact}
        landscape={landscape}
        codeCopied={codeCopied}
        onCopyCode={() => void copyCode()}
        onOpenPeople={() => setSheet('people')}
        onOpenMenu={() => setSheet('menu')}
        onOpenPrivacy={() => setSheet('privacy')}
        onOpenShare={() => setSheet('share')}
        onGoHome={() => navigate('/')}
      />

      <Toolbar compact={compact} />
      <BottomControls top={controlsTop} />
      <ConnectionBanner top={controlsTop + 44} onRetry={sync.retry} />

      <ToastHost bottom={compact ? 140 : 132} enabled={!anyOverlay} />

      <ShareSheet
        open={sheet === 'share'}
        onClose={() => setSheet(null)}
        link={link}
        onOpenExport={() => setSheet('export')}
        onOpenPrivacy={() => setSheet('privacy')}
      />
      <PeopleSheet open={sheet === 'people'} onClose={() => setSheet(null)} />
      <PrivacySheet
        open={sheet === 'privacy'}
        onClose={() => setSheet(null)}
        onOpenPeople={() => setSheet('people')}
      />
      <ExportSheet open={sheet === 'export'} onClose={() => setSheet(null)} />
      <ImportSheet
        open={sheet === 'import'}
        onClose={() => setSheet(null)}
        onImportSnapshot={handleImportSnapshot}
        allowImagePlacement
      />
      <MenuSheet
        open={sheet === 'menu'}
        onClose={() => setSheet(null)}
        onOpenExport={() => setSheet('export')}
        onOpenImport={() => setSheet('import')}
        onOpenPrivacy={() => setSheet('privacy')}
        onOpenPeople={() => setSheet('people')}
        onOpenSettings={() => setSheet('settings')}
      />
      <SettingsSheet
        open={sheet === 'settings'}
        onClose={() => setSheet(null)}
        onAskClear={() => setConfirm('clear')}
        onAskDelete={() => setConfirm('delete')}
      />

      <ConfirmDialog
        open={confirm !== null}
        tone={confirm === 'delete' ? 'danger' : 'warn'}
        title={confirm === 'delete' ? t.deleteTitle : t.clearTitle}
        body={
          confirm === 'delete' ? fill(t.deleteBody, { CODE: meta?.shortCode ?? '' }) : t.clearBody
        }
        confirmLabel={confirm === 'delete' ? t.deleteCta : t.clearCta}
        cancelLabel={t.cancel}
        busy={deleting}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
