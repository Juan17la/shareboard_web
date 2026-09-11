/**
 * Home: create a board, join one with a code, or reopen a recent one.
 *
 * The design gives creation a single button and no form. Everything a board
 * used to be configured with up front — name, visibility, PIN, who can edit —
 * is now changed from inside the board, where the creator can see what they are
 * changing. "Crear una pizarra sin necesidad de registrarse"
 * (mobile/docs/01) is meant to be two clicks, and asking four questions before
 * the canvas appears was the thing standing in the way.
 *
 * Above the tablet breakpoint the same content reflows into two columns rather
 * than stretching one narrow strip across a monitor.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useT, relativeTime, useToggleLang } from '../features/i18n';
import { useSessionStore } from '../features/session';
import { createBoard, importSnapshot, resolveShortCode } from '../lib/api';
import type { BoardSnapshot } from '../lib/contract';
import { parseBoardRef } from '../lib/deep-link';

import { ImportSheet } from '../components/sheets/ImportSheet';
import { Avatar } from '../components/ui/Avatar';
import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { GlassPanel } from '../components/ui/Glass';
import { Icon } from '../components/ui/Icon';
import { SectionLabel } from '../components/ui/Sheet';
import { ToastHost } from '../components/ui/Toast';
import { toast } from '../lib/toast';

export default function HomePage() {
  const navigate = useNavigate();
  const t = useT();
  const toggleLang = useToggleLang();
  const userId = useSessionStore((s) => s.userId);
  const nickColor = useSessionStore((s) => s.nickColor);
  const recent = useSessionStore((s) => s.recent);
  const forgetBoard = useSessionStore((s) => s.forgetBoard);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);

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
        name: t.newBoardName,
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

  async function handleJoin() {
    const ref = parseBoardRef(code);
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
      toast(error instanceof Error ? error.message : t.errJoin);
    } finally {
      setBusy(false);
    }
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

  const canJoin = code.trim().length >= 3 && !busy;

  return (
    <main className="relative h-full overflow-y-auto">
      <Backdrop variant="home" />

      <div className="relative mx-auto flex w-full max-w-[980px] flex-col gap-6 px-6 py-8 sm:px-10 sm:py-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[11px] bg-accent text-white shadow-accent">
              <Icon name="board" size={19} />
            </span>
            <span className="text-[20px] font-extrabold tracking-[-0.4px]">{t.appName}</span>
            <span className="hidden h-3.5 w-px bg-line-strong sm:block" />
            <span className="hidden text-[12px] font-semibold text-text-secondary sm:block">
              {t.tagline}
            </span>
          </div>
          <button
            type="button"
            aria-label={t.language}
            onClick={toggleLang}
            className="rounded-[11px] border border-line-strong bg-white/80 px-2.5 py-1.5 text-[11px] font-bold backdrop-blur-md transition hover:bg-white"
          >
            {t.langLabel}
          </button>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
          <section className="flex min-w-0 flex-1 flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.6px] sm:text-[34px]">
                {t.homeTitle}
              </h1>
              <p className="text-[14px] leading-relaxed text-[#565D6C] sm:text-[15px]">
                {t.homeSub}
              </p>
            </div>
            <Button
              label={t.createBoard}
              icon="plus"
              onClick={() => void handleCreate()}
              loading={busy}
              fullWidth
            />
          </section>

          <section className="flex min-w-0 flex-1 flex-col gap-5">
            <GlassPanel level="row" radius={20}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canJoin) void handleJoin();
                }}
                className="flex flex-col gap-3 p-4"
              >
                <h2 className="text-[13px] font-extrabold">{t.joinTitle}</h2>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABC-123"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={40}
                    aria-label={t.codeFieldLabel}
                    className="min-w-0 flex-1 rounded-[14px] border border-line-strong bg-white px-3.5 py-3 font-mono text-[15px] font-bold tracking-[1.5px] text-text outline-none focus:border-accent placeholder:text-[rgba(27,32,48,0.3)]"
                  />
                  <button
                    type="submit"
                    aria-label={t.enter}
                    disabled={!canJoin}
                    className="rounded-[14px] px-4 text-[13.5px] font-extrabold text-white transition"
                    style={{
                      background: canJoin ? 'var(--color-accent)' : 'rgba(27,32,48,0.14)',
                    }}
                  >
                    {t.enter}
                  </button>
                </div>
                <p className="text-[11.5px] leading-snug text-text-secondary">{t.joinHint}</p>
              </form>
            </GlassPanel>

            <div className="flex flex-col gap-2">
              <SectionLabel>{t.recent}</SectionLabel>
              {recent.length === 0 ? (
                <p className="text-[11.5px] leading-snug text-text-secondary">{t.noRecent}</p>
              ) : (
                recent.map((board) => (
                  <GlassPanel key={board.id} level="row" radius={16}>
                    <div className="flex items-center">
                      <button
                        type="button"
                        aria-label={`${board.name}, ${board.shortCode}`}
                        onClick={() => openBoard(board.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/70"
                      >
                        <Avatar name={board.name} color={nickColor} size={38} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] leading-tight font-bold">
                            {board.name}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-text-secondary">
                            {board.shortCode} · {relativeTime(t, board.lastOpenedAt)}
                          </span>
                        </span>
                      </button>
                      {/* Mobile's long-press has no pointer equivalent, so
                          "forget" gets its own small button here. */}
                      <button
                        type="button"
                        aria-label={t.forget}
                        title={t.forget}
                        onClick={() => {
                          forgetBoard(board.id);
                          toast(t.forget);
                        }}
                        className="mr-2 grid h-9 w-9 flex-none place-items-center rounded-[11px] text-text-tertiary transition hover:bg-white hover:text-danger"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  </GlassPanel>
                ))
              )}
            </div>

            <Button
              label={t.importBoard}
              icon="upload"
              variant="dashed"
              onClick={() => setImporting(true)}
              fullWidth
            />
          </section>
        </div>
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
