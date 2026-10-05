/**
 * The board screen.
 *
 * It owns three things the design keeps deliberately flat: the connection phase
 * (identity -> PIN -> live), which sheet is open, and which confirm dialog is
 * open. Everything else is a child — the canvas, the floating header, the tool
 * rail, the bottom controls — and every sheet is a component rendered right
 * here rather than a route, so the board stays visible underneath.
 *
 * There is no page behind it: the app opens on the last whiteboard, and the
 * menu is where a new one, an old one, a code or a file is reached from. The
 * identity step only appears when a name clashes with someone's on the board
 * (everyone starts with a guest name, changed in the settings).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { BoardCanvas } from '../components/board/BoardCanvas';
import { ConnectionBanner } from '../components/board/ConnectionBanner';
import { BottomControls } from '../components/board/BottomControls';
import { Toolbar } from '../components/board/Toolbar';
import { BoardHeader } from '../components/header/BoardHeader';
import { NicknameScreen } from '../components/screens/NicknameScreen';
import { PinScreen } from '../components/screens/PinScreen';
import { AiSheet } from '../components/sheets/AiSheet';
import { BoardsSheet } from '../components/sheets/BoardsSheet';
import { ExportSheet } from '../components/sheets/ExportSheet';
import { ImportSheet } from '../components/sheets/ImportSheet';
import { JoinSheet } from '../components/sheets/JoinSheet';
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
import { GlassPanel } from '../components/ui/Glass';
import { useSessionStore } from '../features/session';
import { useBoardStore } from '../features/board-store';
import { useBoardSync } from '../hooks/use-board-sync';
import { createBoard, deleteBoard, importSnapshot } from '../lib/api';
import type { BoardSnapshot } from '../lib/contract';
import { copyText } from '../lib/clipboard';
import { WEB_BASE_URL } from '../lib/config';
import { boardShareLink } from '../lib/deep-link';
import { Layout } from '../lib/theme';

import { useViewport } from '../hooks/use-viewport';
import { useShortcuts } from '../hooks/use-shortcuts';

type SheetName =
  | 'share'
  | 'people'
  | 'privacy'
  | 'export'
  | 'import'
  | 'menu'
  | 'settings'
  | 'ai'
  | 'join'
  | 'boards';
type ConfirmName = 'clear' | 'delete';

export default function BoardPage() {
  const { id = '' } = useParams();
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

  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [confirm, setConfirm] = useState<ConfirmName | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const sync = useBoardSync(id);
  const headerBottom = useHeaderBottom(sync.phase);
  // Keys belong to the board only while it is the thing on screen.
  const openShortcuts = useCallback(() => setSheet('settings'), []);
  useShortcuts(sync.phase === 'ready' && sheet === null && confirm === null, openShortcuts);

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
      navigate(`/board/${created.id}`, { replace: true });
    },
    [navigate, t, userId],
  );

  const [creating, setCreating] = useState(false);
  /** A fresh, empty whiteboard — public, anyone with the code can draw; the access button changes that. */
  const createNew = useCallback(async () => {
    setCreating(true);
    try {
      const created = await createBoard({
        name: t.newBoardName,
        access: 'public',
        editPolicy: 'everyone',
        creatorId: userId,
      });
      setSheet(null);
      navigate(`/board/${created.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : t.errCreate);
    } finally {
      setCreating(false);
    }
  }, [navigate, t, userId]);

  // A board that is gone (deleted, or its server forgot it) is let go of; the
  // root then opens the next one, or a new one.
  useEffect(() => {
    if (!sync.notFound) return;
    forgetBoard(id);
    navigate('/', { replace: true });
  }, [sync.notFound, id, forgetBoard, navigate]);

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
        onContinue={(name) => sync.submitNickname(name)}
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
          <h1 className="text-[1.25rem] leading-tight font-extrabold tracking-[-0.4px]">
            {t.errOpen}
          </h1>
          {sync.error ? (
            <p className="text-[0.8125rem] leading-relaxed text-text-secondary">{sync.error}</p>
          ) : null}
          <Button
            label={t.newWhiteboard}
            icon="plus"
            variant="secondary"
            loading={creating}
            onClick={() => void createNew()}
          />
        </div>
      </main>
    );
  }

  if (sync.phase === 'loading' || !nickname) {
    return (
      <main className="grid h-full place-items-center bg-background">
        <div className="sb-loading" role="status" aria-label={t.loading} />
        <p className="sb-late text-[0.8125rem] font-semibold text-text-tertiary">{t.loading}</p>
      </main>
    );
  }

  // --- the board ----------------------------------------------------------

  const link = meta ? boardShareLink(WEB_BASE_URL, meta.shortCode) : '';
  const anyOverlay = sheet !== null || confirm !== null;
  // Just under the header, whichever shape it takes.
  // Never above where the header's own height would put it: large text makes the
  // header taller, and the controls must move down with it, not sit on top of it.
  const controlsTop = Math.max(
    landscape ? (compact ? 62 : 76) : compact ? 108 : 128,
    headerBottom + 12,
  );

  return (
    <div className="relative h-full overflow-hidden bg-background">
      <BoardCanvas onCursorMove={sync.sendCursor} />

      <BoardHeader
        compact={compact}
        codeCopied={codeCopied}
        onCopyCode={() => void copyCode()}
        onOpenPeople={() => setSheet('people')}
        onOpenMenu={() => setSheet('menu')}
        onOpenPrivacy={() => setSheet('privacy')}
        onOpenShare={() => setSheet('share')}
        onOpenExport={() => setSheet('export')}
        onOpenSettings={() => setSheet('settings')}
      />

      <Toolbar compact={compact} />
      <BottomControls top={controlsTop} onOpenAi={() => setSheet('ai')} />
      <ConnectionBanner top={controlsTop + 44} onRetry={sync.retry} />
      <FirstRunHint top={controlsTop + 52} />

      <ToastHost bottom={compact ? 140 : 132} enabled={!anyOverlay} />

      <ShareSheet
        open={sheet === 'share'}
        onClose={() => setSheet(null)}
        link={link}
        onOpenExport={() => setSheet('export')}
        onOpenPrivacy={() => setSheet('privacy')}
      />
      <PeopleSheet open={sheet === 'people'} onClose={() => setSheet(null)} />
      <AiSheet open={sheet === 'ai'} onClose={() => setSheet(null)} />
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
        onNew={() => void createNew()}
        onOpenBoards={() => setSheet('boards')}
        onOpenJoin={() => setSheet('join')}
        onOpenImport={() => setSheet('import')}
        onOpenPrivacy={() => setSheet('privacy')}
        onOpenPeople={() => setSheet('people')}
        onOpenAi={() => setSheet('ai')}
      />
      <BoardsSheet open={sheet === 'boards'} onClose={() => setSheet(null)} currentId={id} />
      <JoinSheet open={sheet === 'join'} onClose={() => setSheet(null)} />
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

/**
 * A one-time nudge on an empty board: the toolbar is icon-only, so someone who
 * has never used a whiteboard is told what to do first. It goes away by itself
 * the moment the board has anything on it, and for good once dismissed.
 */
function FirstRunHint({ top }: { top: number }) {
  const t = useT();
  const dismissed = useSessionStore((s) => s.hintDismissed);
  const dismiss = useSessionStore((s) => s.dismissHint);
  const canEdit = useBoardStore((s) => s.canEditNow());
  const empty = useBoardStore((s) => !Object.values(s.elements).some((el) => !el.deleted));

  useEffect(() => {
    if (!empty && !dismissed) dismiss();
  }, [empty, dismissed, dismiss]);

  if (dismissed || !empty || !canEdit) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4" style={{ top }}>
      <GlassPanel level="chip" radius={16} overflow="visible" className="pointer-events-auto max-w-[340px] shadow-panel">
        <div className="flex items-center gap-3 py-2.5 pr-2.5 pl-4">
          <p className="text-[0.8125rem] leading-snug font-semibold">{t.firstRunHint}</p>
          <button
            type="button"
            onClick={dismiss}
            className="flex-none rounded-[10px] bg-accent px-3 py-1.5 text-[0.7812rem] font-extrabold text-white transition hover:bg-accent-deep"
          >
            {t.gotIt}
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}

/** The bottom edge of the board header in px, re-measured whenever the header resizes. */
function useHeaderBottom(phase: string): number {
  const [bottom, setBottom] = useState(0);
  useEffect(() => {
    const el = document.querySelector('header[data-board-header]');
    if (!el) return;
    const measure = () => setBottom(Math.ceil(el.getBoundingClientRect().bottom));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [phase]);
  return bottom;
}
