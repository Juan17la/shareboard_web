/**
 * "Settings": the local switches, the language toggle, and the two destructive
 * actions.
 *
 * The switches are per-browser preferences, not board state — nobody else's
 * canvas changes when you turn the dot grid off — so they are written straight
 * to the persisted session store with no network involved.
 *
 * The board's name is editable here too. It is not in the design's settings
 * list, but the header shows the name prominently and nothing else in the app
 * could change it; the alternative was a board permanently called whatever it
 * was called on the day it was made.
 *
 * Four groups, each one card of rows: who you are, this board (with its
 * destructive actions last), how the board looks, and help. The full shortcut
 * list is its own sheet, one row away, instead of a wall of text here.
 *
 * The mobile app's fourth switch, "Vibración al tocar", has no web counterpart
 * and is left out rather than shown as a dead control.
 */
import { useState } from 'react';

/** Touch devices get gestures, not key names — a keyboard shortcut list is
 *  dead weight on a phone or tablet. */
function useCoarsePointer() {
  const [coarse] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  return coarse;
}

import { useT, useToggleLang } from '../../features/i18n';
import type { Lang } from '../../features/strings';
import { useSessionStore, type AppSettings } from '../../features/session';
import { useBoardStore } from '../../features/board-store';
import { renameBoard } from '../../lib/api';
import { isLocalId, updateLocal } from '../../features/board-local';
import { LIMITS } from '../../lib/contract';

import { AvatarPicker } from '../screens/NicknameScreen';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';
import { Sheet, SheetGroup, SheetRow } from '../ui/Sheet';
import { Toggle } from '../ui/Toggle';
import { toast } from '../../lib/toast';

export function SettingsSheet({
  open,
  onClose,
  onAskClear,
  onAskDelete,
  onOpenAccount,
  onOpenShortcuts,
}: {
  open: boolean;
  onClose: () => void;
  onAskClear: () => void;
  onAskDelete: () => void;
  onOpenAccount: () => void;
  onOpenShortcuts: () => void;
}) {
  const t = useT();
  const coarsePointer = useCoarsePointer();
  const toggleLang = useToggleLang();
  const lang = useSessionStore((s) => s.lang);
  const settings = useSessionStore((s) => s.settings);
  const setSetting = useSessionStore((s) => s.setSetting);
  const theme = useSessionStore((s) => s.theme);
  const setTheme = useSessionStore((s) => s.setTheme);
  const userId = useSessionStore((s) => s.userId);
  const nickname = useSessionStore((s) => s.nickname);
  const nickColor = useSessionStore((s) => s.nickColor);
  const avatar = useSessionStore((s) => s.avatar);
  const setNickname = useSessionStore((s) => s.setNickname);
  const account = useSessionStore((s) => s.account);
  const [nick, setNick] = useState(nickname);
  // Saved when the field is left, not per keystroke: a new nickname rejoins the
  // board, which reloaded it on every character typed.
  const commitNick = () => {
    const next = nick.trim();
    // Never empty: a blank name would send you back to the identity screen.
    if (next && next !== nickname) setNickname(next);
  };

  const meta = useBoardStore((s) => s.meta);
  const setMeta = useBoardStore((s) => s.setMeta);
  const boardToken = useBoardStore((s) => s.boardToken);
  const canEdit = useBoardStore((s) => s.canEditNow());

  const remoteName = meta?.name ?? '';
  const [name, setName] = useState(remoteName);
  const [renaming, setRenaming] = useState(false);

  // Re-seed the field whenever the sheet opens, and whenever a rename lands
  // from another client, so it never shows a stale draft. This is the
  // "adjusting state when a prop changes" pattern rather than an effect: it
  // runs during the same render, so the field never paints the old value first.
  const [seed, setSeed] = useState({ open, remoteName });
  if (seed.open !== open || seed.remoteName !== remoteName) {
    setSeed({ open, remoteName });
    setName(remoteName);
  }

  const isCreator = !!meta && meta.creatorId === userId;

  const rows: { key: keyof AppSettings; label: string; desc: string }[] = [
    { key: 'grid', label: t.settingGrid, desc: t.settingGridDesc },
    { key: 'peers', label: t.settingPeers, desc: t.settingPeersDesc },
    { key: 'smooth', label: t.settingSmooth, desc: t.settingSmoothDesc },
  ];

  async function commitName() {
    const next = name.trim();
    if (!meta || !isCreator || !next || next === meta.name) {
      setName(meta?.name ?? '');
      return;
    }
    setRenaming(true);
    try {
      if (isLocalId(meta.id)) {
        // The offline board is renamed where it lives.
        await updateLocal(meta.id, { name: next });
        setMeta({ ...meta, name: next });
        toast(t.toastRenamed);
        return;
      }
      const updated = await renameBoard(meta.id, next, { userId, token: boardToken ?? '' });
      setMeta(updated);
      toast(t.toastRenamed);
    } catch (error) {
      setName(meta.name);
      toast(error instanceof Error ? error.message : t.errRename);
    } finally {
      setRenaming(false);
    }
  }

  const chevron = <Icon name="chevron" size={14} className="flex-none text-text-tertiary" />;
  const inputRow =
    'flex min-h-12 items-center gap-3 px-3 py-1.5 transition focus-within:shadow-[inset_0_0_0_2px_var(--color-accent)]';

  return (
    <Sheet
      open={open}
      title={t.sheetSettings}
      onClose={() => {
        commitNick();
        onClose();
      }}
      closeLabel={t.close}
    >
      <div className="flex flex-col gap-4">
        <SheetGroup title={t.setYou} line="blue">
          <SheetRow
            title={account ? `@${account.username}` : t.accountGuest}
            description={account ? t.sheetAccount : t.accountGuestDesc}
            ariaLabel={t.sheetAccount}
            onClick={() => {
              commitNick();
              onOpenAccount();
            }}
            right={account ? chevron : <span className="flex-none text-[0.8125rem] font-bold text-accent-text">{t.signIn}</span>}
          />
          {/* Who you are on a board: the name beside your cursor and its icon. */}
          <label className={inputRow}>
            <Avatar name={nick || '?'} color={nickColor} avatar={avatar} size={32} />
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value.trimStart().slice(0, LIMITS.maxNicknameLength))}
              onBlur={commitNick}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder={t.nickPlaceholder}
              autoComplete="nickname"
              aria-label={t.nickPlaceholder}
              className="sb-bare min-w-0 flex-1 bg-transparent text-[0.9375rem] font-medium outline-none placeholder:text-text-secondary"
            />
            <Icon name="edit" size={15} className="flex-none text-text-tertiary" />
          </label>
          <div className="flex flex-col gap-2 px-3 py-2.5">
            <div className="text-[0.75rem] font-semibold text-text-secondary">{t.yourIcon}</div>
            <AvatarPicker name={nick} />
          </div>
        </SheetGroup>

        {meta ? (
          <SheetGroup title={t.menuThisBoard} line="green">
            <label className={isCreator ? inputRow : `${inputRow} focus-within:shadow-none`}>
              <span className="w-16 flex-none text-[0.8125rem] font-semibold text-text-secondary">{t.boardName}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void commitName()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                readOnly={!isCreator || renaming}
                maxLength={LIMITS.maxBoardNameLength}
                aria-label={t.rename}
                className={`sb-bare min-w-0 flex-1 bg-transparent text-[0.9375rem] font-medium outline-none ${isCreator ? 'text-text' : 'text-text-secondary'}`}
              />
              {isCreator ? <Icon name="edit" size={15} className="flex-none text-text-tertiary" /> : null}
            </label>
            {canEdit ? (
              <SheetRow
                title={t.clearBoard}
                tone="danger"
                onClick={onAskClear}
                right={<Icon name="trash" size={16} className="flex-none text-danger" />}
              />
            ) : null}
            {/* The offline board is never deleted, only cleared: the app always opens on it. */}
            {isCreator && !isLocalId(meta.id) ? (
              <SheetRow
                title={t.deleteBoard}
                tone="danger"
                onClick={onAskDelete}
                right={<Icon name="x-circle" size={16} className="flex-none text-danger" />}
              />
            ) : null}
          </SheetGroup>
        ) : null}

        <SheetGroup title={t.setDisplay} line="violet">
          {rows.map((row) => (
            <SheetRow
              key={row.key}
              title={row.label}
              description={row.desc}
              right={<Toggle value={settings[row.key]} onChange={(next) => setSetting(row.key, next)} label={row.label} />}
            />
          ))}
          <SheetRow
            title={t.settingTheme}
            description={t.settingThemeDesc}
            right={<Toggle value={theme === 'dark'} onChange={(on) => setTheme(on ? 'dark' : 'light')} label={t.settingTheme} />}
          />
          <div className="flex min-h-12 items-center justify-between gap-3 px-3 py-2">
            <div className="text-[0.875rem] font-semibold">{t.language}</div>
            <div className="w-44">
              <Segmented<Lang>
                label={t.language}
                value={lang}
                onChange={(next) => {
                  if (next !== lang) toggleLang();
                }}
                options={[
                  { value: 'es', label: 'Español' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>
          </div>
        </SheetGroup>

        <SheetGroup title={t.setHelp} line="orange">
          <SheetRow
            title={t.tourReplay}
            description={t.tourReplayDesc}
            onClick={() => {
              useSessionStore.getState().setTutorialDone(false);
              onClose();
            }}
            right={chevron}
          />
          {coarsePointer ? (
            <div className="flex flex-col gap-1.5 px-3 py-2.5">
              <div className="text-[0.875rem] font-semibold">{t.gestures}</div>
              {/* One gesture per line, not one run-on sentence. */}
              <ul className="flex list-disc flex-col gap-1 pl-4 text-[0.8125rem] leading-snug text-text-secondary marker:text-text-tertiary">
                {t.gesturesDesc.split(' · ').map((gesture) => (
                  <li key={gesture}>{gesture.charAt(0).toUpperCase() + gesture.slice(1)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <SheetRow
              title={t.shortcuts}
              description={t.shortcutsDesc}
              onClick={() => {
                commitNick();
                onOpenShortcuts();
              }}
              right={
                <span className="flex flex-none items-center gap-2">
                  <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] border-[1.5px] border-line-strong px-1.5 font-sans text-[0.75rem] font-semibold">
                    ?
                  </kbd>
                  {chevron}
                </span>
              }
            />
          )}
        </SheetGroup>
      </div>
    </Sheet>
  );
}
