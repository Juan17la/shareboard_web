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
 * menu is where a new one, an old one, a code or a file is reached from.
 * Nothing comes before the first stroke: the identity step appears the first
 * time a live board opens (shared or joined), then only when a name clashes
 * with someone's on the board.
 *
 * A live board is a shared one, so making one (new, imported, or the offline
 * board shared) needs an account: a guest is shown the account sheet instead,
 * and brought back to where they were once signed in.
 */
import { Suspense, lazy, useCallback, useEffect, useState, type ComponentType } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { BoardCanvas } from '../components/board/BoardCanvas';
import { ConnectionBanner } from '../components/board/ConnectionBanner';
import { BottomControls } from '../components/board/BottomControls';
import { ReactionStream, TimerPill } from '../components/board/ClassControls';
import { Toolbar } from '../components/board/Toolbar';
import { Tutorial } from '../components/board/Tutorial';
import { BoardHeader } from '../components/header/BoardHeader';
import { NicknameScreen } from '../components/screens/NicknameScreen';
import { PinScreen } from '../components/screens/PinScreen';
import { BoardsSheet } from '../components/sheets/BoardsSheet';
import { JoinSheet } from '../components/sheets/JoinSheet';
import { MenuSheet } from '../components/sheets/MenuSheet';
import { PeopleSheet } from '../components/sheets/PeopleSheet';
import { PrivacySheet } from '../components/sheets/PrivacySheet';
import { SettingsSheet } from '../components/sheets/SettingsSheet';
import { ShortcutsSheet } from '../components/sheets/ShortcutsSheet';
import { TemplatesSheet } from '../components/sheets/TemplatesSheet';
import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SheetBack } from '../components/ui/sheet-back';
import { ToastHost } from '../components/ui/Toast';
import { toast } from '../lib/toast';
import { fill, useT } from '../features/i18n';
import { GlassPanel } from '../components/ui/Glass';
import { useSessionStore } from '../features/session';
import { hasContent, useBoardStore } from '../features/board-store';
import { isLocalId } from '../features/board-local';
import { useBoardSync } from '../hooks/use-board-sync';
import { createBoard, deleteBoard, importSnapshot } from '../lib/api';
import type { BoardSnapshot } from '../lib/contract';
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
  | 'shortcuts'
  | 'ai'
  | 'templates'
  | 'join'
  | 'boards'
  | 'account';
type ConfirmName = 'clear' | 'delete';

// The sheets most sessions never open (and the QR encoder, the SVG export and
// the sign-in form behind them) load the first time they open, not with the
// board. Once loaded a sheet stays mounted, so closing it works as before.
function lazySheet<P extends { open: boolean }>(load: () => Promise<ComponentType<P>>) {
  const Lazy = lazy(() => load().then((Sheet) => ({ default: Sheet })));
  return function LazySheet(props: P) {
    const [opened, setOpened] = useState(props.open);
    if (props.open && !opened) setOpened(true);
    return opened ? (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    ) : null;
  };
}
const AccountSheet = lazySheet(() => import('../components/sheets/AccountSheet').then((m) => m.AccountSheet));
const AiSheet = lazySheet(() => import('../components/sheets/AiSheet').then((m) => m.AiSheet));
const ExportSheet = lazySheet(() => import('../components/sheets/ExportSheet').then((m) => m.ExportSheet));
const ImportSheet = lazySheet(() => import('../components/sheets/ImportSheet').then((m) => m.ImportSheet));
const ShareSheet = lazySheet(() => import('../components/sheets/ShareSheet').then((m) => m.ShareSheet));

export default function BoardPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const { width, height } = useViewport();
  // Phone-sized in either direction: a landscape phone is wide but only ~360px
  // tall, and the side rail would eat the board, so height counts too.
  const compact = width < Layout.compactBreakpoint || height < 480;
  // Same rule as the mobile app: in landscape the header collapses to one row
  // and the tool rail moves up to meet it.
  const landscape = width > height;

  const nickname = useSessionStore((s) => s.nickname);
  const forgetBoard = useSessionStore((s) => s.forgetBoard);
  const userId = useSessionStore((s) => s.userId);
  const onboarded = useSessionStore((s) => s.onboarded);
  const signedIn = useSessionStore((s) => s.account !== null);

  const meta = useBoardStore((s) => s.meta);
  const clearBoard = useBoardStore((s) => s.clearBoard);

  // Sheets opened from another sheet stack up, so each can go back to the one
  // that opened it; `setSheet` starts over, `pushSheet` goes one deeper.
  const [stack, setStack] = useState<SheetName[]>([]);
  const sheet = stack.at(-1) ?? null;
  const setSheet = useCallback((next: SheetName | null) => setStack(next ? [next] : []), []);
  const pushSheet = useCallback((next: SheetName) => setStack((s) => [...s, next]), []);
  const backSheet = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const [confirm, setConfirm] = useState<ConfirmName | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Where to go back to once signed in, and why the account sheet is asking.
  const [afterSignIn, setAfterSignIn] = useState<SheetName | null>(null);
  const askAccount = useCallback((from: SheetName | null) => {
    setAfterSignIn(from);
    pushSheet('account');
  }, [pushSheet]);

  // A live board waits for a name, asked once; the offline board needs none.
  const sync = useBoardSync(id, { paused: !onboarded && !isLocalId(id) });
  const headerBottom = useHeaderBottom(sync.phase);
  // Keys belong to the board only while it is the thing on screen.
  const openShortcuts = useCallback(() => pushSheet('shortcuts'), [pushSheet]);
  useShortcuts(sync.phase === 'ready' && sheet === null && confirm === null, openShortcuts);

  const handleImportSnapshot = useCallback(
    async (snapshot: BoardSnapshot) => {
      if (!signedIn) {
        askAccount('import');
        return;
      }
      // Always a new board, never a paste into this one — importing must not be
      // able to overwrite something other people are working on.
      const created = await importSnapshot(
        { ...snapshot, meta: { name: snapshot.meta.name || t.importedBoardName } },
        userId,
      );
      navigate(`/board/${created.id}`, { replace: true });
    },
    [navigate, t, userId, signedIn, askAccount],
  );

  const [creating, setCreating] = useState(false);
  /** A fresh, empty whiteboard — public, anyone with the code can draw; the access button changes that. */
  const createNew = useCallback(async (name = '') => {
    if (!signedIn) {
      askAccount('join');
      return;
    }
    setCreating(true);
    try {
      const created = await createBoard({
        name: name || t.newBoardName,
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
  }, [navigate, t, userId, signedIn, askAccount, setSheet]);

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

  // An account is registered under the name, so one not chosen yet is asked first.
  if (sheet === 'account' && !onboarded) {
    return (
      <NicknameScreen
        blank
        onCancel={() => setSheet(null)}
        onContinue={(name) => {
          useSessionStore.getState().setNickname(name);
          useSessionStore.getState().setOnboarded();
        }}
      />
    );
  }

  if (sync.phase === 'need-nickname') {
    return (
      <NicknameScreen
        error={sync.error}
        blank={!onboarded}
        onContinue={(name) => {
          sync.submitNickname(name);
          useSessionStore.getState().setOnboarded();
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
        <Backdrop />
        <div className="relative flex h-full flex-col items-center justify-center gap-3.5 p-7 text-center">
          <h1 className="text-[1.25rem] leading-tight font-extrabold tracking-[-0.4px]">
            {t.errOpen}
          </h1>
          {sync.error ? (
            <p className="text-[0.8125rem] leading-relaxed text-text-secondary">{sync.error}</p>
          ) : null}
          {/* A guest cannot make a live board; their own offline one is always there. */}
          <Button
            label={signedIn ? t.newWhiteboard : t.localBoardName}
            icon={signedIn ? 'plus' : 'pencil'}
            variant="secondary"
            loading={creating}
            onClick={() => (signedIn ? void createNew() : navigate('/', { replace: true }))}
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
  // Just under the header, measured: large text makes it taller, and the
  // controls move down with it instead of sitting on top of it.
  const controlsTop = Math.max(landscape ? 56 : 64, headerBottom + 12);

  return (
    <SheetBack.Provider value={stack.length > 1 ? backSheet : undefined}>
    <div className="relative h-full overflow-clip bg-background">
      <BoardCanvas onCursorMove={sync.sendCursor} onPreview={sync.sendPreview} />

      <BoardHeader
        onOpenPeople={() => pushSheet('people')}
        onOpenMenu={() => setSheet('menu')}
        onOpenShare={() => setSheet('share')}
      />

      <Toolbar compact={compact} />
      <BottomControls top={controlsTop} compact={compact} onReact={sync.sendReact} onTimer={sync.sendTimer} />
      <TimerPill top={controlsTop} />
      {/* Above the bottom toolbar on a phone; on a wide screen the tools are down the left. */}
      <ReactionStream bottom={compact ? 150 : 32} />
      <ConnectionBanner top={controlsTop + 48} onRetry={sync.retry} />
      {/* Hidden while a sheet covers the toolbar it points at. */}
      {sheet ? null : <FirstRunHint top={controlsTop + 56} />}
      <Tutorial compact={compact} offerTop={controlsTop + 56} />

      <ToastHost bottom={compact ? 140 : 132} enabled={!anyOverlay} />

      <ShareSheet
        open={sheet === 'share'}
        onClose={() => setSheet(null)}
        link={link}
        onOpenPrivacy={() => pushSheet('privacy')}
        onNeedAccount={() => askAccount('share')}
      />
      <PeopleSheet open={sheet === 'people'} onClose={() => setSheet(null)} />
      <AiSheet open={sheet === 'ai'} onClose={() => setSheet(null)} />
      <TemplatesSheet open={sheet === 'templates'} onClose={() => setSheet(null)} />
      <PrivacySheet
        open={sheet === 'privacy'}
        onClose={() => setSheet(null)}
        onOpenPeople={() => pushSheet('people')}
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
        onOpenBoards={() => pushSheet('boards')}
        onOpenNew={() => pushSheet('join')}
        onOpenImport={() => pushSheet('import')}
        onOpenExport={() => pushSheet('export')}
        onOpenPrivacy={() => pushSheet('privacy')}
        onOpenPeople={() => pushSheet('people')}
        onOpenAi={() => pushSheet('ai')}
        onOpenTemplates={() => pushSheet('templates')}
        onOpenSettings={() => pushSheet('settings')}
        onOpenShortcuts={openShortcuts}
      />
      <BoardsSheet open={sheet === 'boards'} onClose={() => setSheet(null)} currentId={id} />
      <JoinSheet
        open={sheet === 'join'}
        onClose={() => setSheet(null)}
        onCreate={(name) => void createNew(name)}
        creating={creating}
      />
      <SettingsSheet
        open={sheet === 'settings'}
        onClose={() => setSheet(null)}
        onAskClear={() => setConfirm('clear')}
        onAskDelete={() => setConfirm('delete')}
        onOpenAccount={() => askAccount(null)}
        onOpenShortcuts={openShortcuts}
      />
      <ShortcutsSheet open={sheet === 'shortcuts'} onClose={() => setSheet(null)} />
      <AccountSheet
        open={sheet === 'account'}
        onClose={() => setSheet(null)}
        onSignedIn={() => setSheet(afterSignIn)}
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
    </SheetBack.Provider>
  );
}

/**
 * A one-time nudge on an empty board: the toolbar is icon-only, so someone who
 * has never used a whiteboard is told what to do first. It goes away by itself
 * the moment the board has anything on it, and for good once dismissed.
 */
function FirstRunHint({ top }: { top: number }) {
  const t = useT();
  // While the tutorial runs it does the telling.
  const dismissed = useSessionStore((s) => s.hintDismissed || !s.tutorialDone);
  const dismiss = useSessionStore((s) => s.dismissHint);
  const canEdit = useBoardStore((s) => s.canEditNow());
  const empty = useBoardStore((s) => !hasContent(s));

  useEffect(() => {
    if (!empty && !dismissed) dismiss();
  }, [empty, dismissed, dismiss]);

  if (dismissed || !empty || !canEdit) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-4" style={{ top }}>
      <GlassPanel level="chip" radius={16} overflow="visible" className="pointer-events-auto max-w-[340px] shadow-panel">
        <div className="flex items-center gap-3 py-2.5 pr-2.5 pl-4">
          <p className="text-[0.8125rem] leading-snug font-semibold text-balance">{t.firstRunHint}</p>
          <button
            type="button"
            onClick={dismiss}
            className="flex-none rounded-full bg-accent px-3.5 py-1.5 text-[0.8125rem] font-bold text-white shadow-accent transition hover:bg-accent-deep"
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
