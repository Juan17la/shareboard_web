/**
 * Home: the whiteboard itself, with a glass card floating over it.
 *
 * There is no landing page to get past — a board is already there behind the
 * card: the real canvas, header and tool rail over a made-up board
 * (`features/demo-board.ts`) with collaborators drifting about, blurred just
 * enough to read as one step away. The card is three tabs: *Start* (name a new board and create
 * it, type a join code, drop a file to import), *Recent* (the boards this
 * browser has opened) and *Settings* (who you are on a board, the theme, the
 * language). Creating a board is one field and one button; everything else a
 * board used to be configured with up front — visibility, PIN, who can edit —
 * is changed from inside it, where the creator can see what they are changing.
 *
 * The join code is six boxes over one invisible input, so the keyboard, paste
 * and autofill all work as they do on any input while the boxes show the code
 * character by character. A pasted link goes straight through `parseBoardRef`.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useT, relativeTime } from '../features/i18n';
import { useSessionStore } from '../features/session';
import { useDemoBoard } from '../features/demo-board';
import { readBoardFile } from '../features/import';
import type { Lang } from '../features/strings';
import { createBoard, importSnapshot, resolveShortCode } from '../lib/api';
import { LIMITS, type BoardSnapshot } from '../lib/contract';
import { parseBoardRef } from '../lib/deep-link';
import { SHORT_CODE_LENGTH, normalizeShortCode } from '../lib/short-code';
import { Layout, type Theme } from '../lib/theme';
import { toast } from '../lib/toast';

import { BoardCanvas } from '../components/board/BoardCanvas';
import { BottomControls } from '../components/board/BottomControls';
import { Toolbar } from '../components/board/Toolbar';
import { BoardHeader } from '../components/header/BoardHeader';
import { AvatarPicker } from '../components/screens/NicknameScreen';
import { ImportSheet } from '../components/sheets/ImportSheet';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { GlassPanel } from '../components/ui/Glass';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { SectionLabel } from '../components/ui/Sheet';
import { ToastHost } from '../components/ui/Toast';
import { useViewport } from '../hooks/use-viewport';

type Tab = 'start' | 'recent' | 'settings';

export default function HomePage() {
  const navigate = useNavigate();
  const t = useT();
  const userId = useSessionStore((s) => s.userId);
  const nickColor = useSessionStore((s) => s.nickColor);
  const recent = useSessionStore((s) => s.recent);
  const forgetBoard = useSessionStore((s) => s.forgetBoard);

  const [tab, setTab] = useState<Tab>('start');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);

  /**
   * `pickName` forces the identity step even for someone whose nickname is
   * already remembered — creating a board is the moment to choose how you will
   * appear on it.
   */
  const openBoard = (boardId: string, pickName = false) => {
    navigate(`/board/${boardId}${pickName ? '?pickName=1' : ''}`);
  };

  async function handleCreate() {
    setBusy(true);
    try {
      const meta = await createBoard({
        name: name.trim() || t.newBoardName,
        access: 'public',
        editPolicy: 'everyone',
        creatorId: userId,
      });
      openBoard(meta.id, true);
    } catch (error) {
      toast(error instanceof Error ? error.message : t.errCreate);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(raw: string) {
    const ref = parseBoardRef(raw);
    if (!ref) {
      toast(t.errCodeInvalid);
      return;
    }
    setBusy(true);
    try {
      const boardId = ref.kind === 'id' ? ref.boardId : await resolveShortCode(ref.shortCode);
      setCode('');
      openBoard(boardId);
    } catch (error) {
      setCode('');
      toast(error instanceof Error ? error.message : t.errJoin);
    } finally {
      setBusy(false);
    }
  }

  /** Characters fill the boxes; a link or an id skips them and joins at once. */
  function onCodeChange(raw: string) {
    if (busy) return;
    if (raw.includes('/') || raw.includes(':')) {
      void handleJoin(raw);
      return;
    }
    const next = normalizeShortCode(raw).slice(0, SHORT_CODE_LENGTH);
    setCode(next);
    if (next.length === SHORT_CODE_LENGTH) void handleJoin(next);
  }

  async function handleImport(snapshot: BoardSnapshot) {
    // An imported file always becomes a *new* board, so importing can never
    // overwrite one that other people are working on.
    const meta = await importSnapshot(
      { ...snapshot, meta: { name: snapshot.meta.name || t.importedBoardName } },
      userId,
    );
    openBoard(meta.id, true);
  }

  async function handleDrop(file: File) {
    setBusy(true);
    try {
      const result = await readBoardFile(file, true);
      if (result.kind !== 'snapshot') throw new Error(t.errImport);
      await handleImport(result.snapshot);
    } catch (error) {
      toast(error instanceof Error ? error.message : t.errImport);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative h-full overflow-hidden">
      <DemoBoard />
      {busy ? <div className="sb-loading" role="status" aria-label={t.loading} /> : null}

      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-4 py-6">
        <GlassPanel
          level="panel"
          radius={26}
          className="sb-dialog w-full max-w-[460px] shadow-panel"
          style={{ maxHeight: 'calc(100% - 16px)' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.appName}
            className="no-scrollbar flex max-h-[calc(100vh-48px)] flex-col gap-5 overflow-y-auto px-5 pb-5 pt-4 sm:px-6"
          >
            <Segmented<Tab>
              label={t.appName}
              value={tab}
              onChange={setTab}
              options={[
                { value: 'start', label: t.tabStart },
                { value: 'recent', label: t.recent },
                { value: 'settings', label: t.tabSettings },
              ]}
            />

            {tab === 'start' ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-accent text-white shadow-accent">
                    <Icon name="board" size={22} />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-[26px] leading-none font-extrabold tracking-[-0.6px]">{t.appName}</h1>
                    <p className="mt-1 text-[12.5px] font-semibold text-text-secondary">{t.tagline}</p>
                  </div>
                </div>

                <form
                  className="flex flex-col gap-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!busy) void handleCreate();
                  }}
                >
                  <Field
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.boardNamePlaceholder}
                    maxLength={LIMITS.maxBoardNameLength}
                    aria-label={t.boardNamePlaceholder}
                  />
                  <Button label={t.createBoard} icon="plus" type="submit" loading={busy} fullWidth />
                </form>

                <div className="flex flex-col gap-2">
                  <SectionLabel>{t.joinCode}</SectionLabel>
                  {/* The boxes are a picture of the input; the input itself is
                      the thing with focus, so paste and autofill just work. */}
                  <div
                    className={`relative flex justify-between gap-1.5 transition-opacity ${busy ? 'opacity-60' : ''}`}
                    onClick={() => codeInput.current?.focus()}
                  >
                    {Array.from({ length: SHORT_CODE_LENGTH }, (_, i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        className={`grid h-[52px] flex-1 place-items-center rounded-[14px] border-[1.5px] font-mono text-[20px] font-bold transition ${
                          code.length === i ? 'border-accent bg-background' : 'border-line-strong bg-glass-solid'
                        }`}
                      >
                        {code[i] ?? ''}
                      </span>
                    ))}
                    <input
                      ref={codeInput}
                      value={code}
                      onChange={(e) => onCodeChange(e.target.value)}
                      aria-label={t.joinCode}
                      autoCapitalize="characters"
                      autoComplete="one-time-code"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                      disabled={busy}
                      className="absolute inset-0 h-full w-full cursor-text opacity-0"
                    />
                  </div>
                  <p className="text-[11.5px] leading-snug text-text-secondary">{t.joinCodeHint}</p>
                </div>

                <button
                  type="button"
                  aria-label={t.importBoard}
                  disabled={busy}
                  onClick={() => setImporting(true)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleDrop(file);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border border-dashed px-3 py-5 transition ${
                    dragging
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line-dashed text-text/60 hover:bg-surface-selected hover:text-text'
                  } ${busy ? 'opacity-55' : ''}`}
                >
                  <Icon name="upload" size={20} />
                  <span className="text-[13px] font-extrabold">{t.importBoard}</span>
                  <span className="text-[11px] font-semibold">{t.homeDropHint}</span>
                </button>
              </>
            ) : null}

            {tab === 'recent' ? (
              <div className="flex flex-col gap-2">
                {recent.length === 0 ? (
                  <p className="py-6 text-center text-[12.5px] leading-snug text-text-secondary">{t.noRecent}</p>
                ) : (
                  recent.map((board) => (
                    <GlassPanel key={board.id} level="row" radius={16}>
                      <div className="flex items-center">
                        <button
                          type="button"
                          aria-label={`${board.name}, ${board.shortCode}`}
                          onClick={() => openBoard(board.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 text-left transition hover:bg-surface-selected"
                        >
                          <Avatar name={board.name} color={nickColor} size={38} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] leading-tight font-bold">{board.name}</span>
                            <span className="mt-0.5 block truncate font-mono text-[11px] text-text-secondary">
                              {board.shortCode} · {relativeTime(t, board.lastOpenedAt)}
                            </span>
                          </span>
                        </button>
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
                      </div>
                    </GlassPanel>
                  ))
                )}
              </div>
            ) : null}

            {tab === 'settings' ? <SettingsTab /> : null}
          </div>
        </GlassPanel>
      </div>

      <ToastHost bottom={32} enabled={!importing} />

      <ImportSheet
        open={importing}
        onClose={() => setImporting(false)}
        onImportSnapshot={handleImport}
        allowImagePlacement={false}
      />
    </main>
  );
}

const noop = () => {};

/**
 * The board the card floats over: the same components as the board screen,
 * fed the demo content, out of focus and out of reach — `inert` keeps every
 * control in it away from the pointer, the keyboard and screen readers.
 */
function DemoBoard() {
  useDemoBoard();
  const { width, height } = useViewport();
  const compact = width < Layout.compactBreakpoint;
  const landscape = width > height;
  return (
    <div
      aria-hidden="true"
      inert
      className="pointer-events-none absolute inset-0 overflow-hidden bg-background select-none"
    >
      {/* Scaled a touch so the blur's soft edge falls outside the screen. */}
      <div className="absolute inset-0 scale-[1.03] blur-[3px]">
        <BoardCanvas />
        <BoardHeader
          compact={compact}
          landscape={landscape}
          codeCopied={false}
          onCopyCode={noop}
          onOpenPeople={noop}
          onOpenMenu={noop}
          onOpenPrivacy={noop}
          onOpenShare={noop}
          onGoHome={noop}
        />
        <Toolbar compact={compact} />
        <BottomControls top={landscape ? (compact ? 62 : 76) : compact ? 108 : 128} onOpenAi={noop} />
      </div>
      {/* A faint veil: the board is there, but not yet yours. */}
      <div className="absolute inset-0 bg-background/25" />
    </div>
  );
}

/** Who you are on a board, and how the app looks: all local, all remembered. */
function SettingsTab() {
  const t = useT();
  const nickname = useSessionStore((s) => s.nickname);
  const nickColor = useSessionStore((s) => s.nickColor);
  const avatar = useSessionStore((s) => s.avatar);
  const setNickname = useSessionStore((s) => s.setNickname);
  const theme = useSessionStore((s) => s.theme);
  const setTheme = useSessionStore((s) => s.setTheme);
  const lang = useSessionStore((s) => s.lang);
  const setLang = useSessionStore((s) => s.setLang);
  const [draft, setDraft] = useState(nickname);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SectionLabel>{t.nickPlaceholder}</SectionLabel>
        <GlassPanel level="row" radius={18}>
          <div className="flex items-center gap-3 p-3">
            <Avatar name={draft || '?'} color={nickColor} avatar={avatar} size={42} />
            <div className="min-w-0 flex-1">
              <Field
                bare
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setNickname(e.target.value);
                }}
                placeholder={t.nickPlaceholder}
                maxLength={LIMITS.maxNicknameLength}
                autoComplete="nickname"
                aria-label={t.nickPlaceholder}
                className="!text-[16px]"
              />
            </div>
          </div>
        </GlassPanel>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>{t.yourIcon}</SectionLabel>
        <AvatarPicker name={draft} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>{t.theme}</SectionLabel>
        <Segmented<Theme>
          label={t.theme}
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: t.themeLight },
            { value: 'dark', label: t.themeDark },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>{t.language}</SectionLabel>
        <Segmented<Lang>
          label={t.language}
          value={lang}
          onChange={setLang}
          options={[
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'English' },
          ]}
        />
      </div>
    </div>
  );
}
