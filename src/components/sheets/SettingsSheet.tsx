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
 * The mobile app's fourth switch, "Vibración al tocar", has no web counterpart
 * and is left out rather than shown as a dead control; the keyboard-shortcuts
 * row takes its place, since a keyboard is what this client has instead.
 */
import { useState } from 'react';

/** Touch devices get gestures, not key names — a keyboard shortcut list is
 *  dead weight on a phone or tablet. */
function useCoarsePointer() {
  const [coarse] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  return coarse;
}

import { useT, useToggleLang } from '../../features/i18n';
import { useSessionStore, type AppSettings } from '../../features/session';
import { useBoardStore } from '../../features/board-store';
import { renameBoard } from '../../lib/api';
import { LIMITS } from '../../lib/contract';
import { Colors } from '../../lib/theme';

import { Button } from '../ui/Button';
import { GlassPanel } from '../ui/Glass';
import { Icon } from '../ui/Icon';
import { Sheet, SheetRow } from '../ui/Sheet';
import { Toggle } from '../ui/Toggle';
import { toast } from '../../lib/toast';

export function SettingsSheet({
  open,
  onClose,
  onAskClear,
  onAskDelete,
}: {
  open: boolean;
  onClose: () => void;
  onAskClear: () => void;
  onAskDelete: () => void;
}) {
  const t = useT();
  const coarsePointer = useCoarsePointer();
  const toggleLang = useToggleLang();
  const settings = useSessionStore((s) => s.settings);
  const setSetting = useSessionStore((s) => s.setSetting);
  const theme = useSessionStore((s) => s.theme);
  const setTheme = useSessionStore((s) => s.setTheme);
  const userId = useSessionStore((s) => s.userId);

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

  return (
    <Sheet open={open} title={t.sheetSettings} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-2.5">
        {meta ? (
          <GlassPanel level="row" radius={15}>
            <div className="flex items-center gap-2.5 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-tight font-bold">{t.boardName}</div>
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
                  className="mt-0.5 w-full bg-transparent p-0 text-[13px] font-semibold outline-none"
                  style={{ color: isCreator ? Colors.text : Colors.textSecondary }}
                />
              </div>
              {isCreator ? (
                <span className="text-text-tertiary">
                  <Icon name="edit" size={16} />
                </span>
              ) : null}
            </div>
          </GlassPanel>
        ) : null}

        {rows.map((row) => (
          <SheetRow
            key={row.key}
            title={row.label}
            description={row.desc}
            right={
              <Toggle
                value={settings[row.key]}
                onChange={(next) => setSetting(row.key, next)}
                label={row.label}
              />
            }
          />
        ))}

        <SheetRow
          title={t.settingTheme}
          description={t.settingThemeDesc}
          right={<Toggle value={theme === 'dark'} onChange={(on) => setTheme(on ? 'dark' : 'light')} label={t.settingTheme} />}
        />

        <GlassPanel level="row" radius={15}>
          <div className="flex items-center justify-between gap-2.5 p-3.5">
            <div className="text-[13px] leading-tight font-bold">{t.language}</div>
            <button
              type="button"
              aria-label={t.language}
              onClick={toggleLang}
              className="rounded-[11px] border border-line-strong bg-surface px-3 py-[7px] text-[11.5px] font-extrabold transition hover:bg-surface-selected"
            >
              {t.langLabel}
            </button>
          </div>
        </GlassPanel>

        {coarsePointer ? (
          <GlassPanel level="row" radius={15}>
            <div className="flex items-start gap-2.5 p-3.5">
              <span className="mt-0.5 text-text-secondary">
                <Icon name="hand" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-tight font-bold">{t.gestures}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                  {t.gesturesDesc}
                </div>
              </div>
            </div>
          </GlassPanel>
        ) : (
          <GlassPanel level="row" radius={15}>
            <div className="flex items-start gap-2.5 p-3.5">
              <span className="mt-0.5 text-text-secondary">
                <Icon name="keyboard" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-tight font-bold">{t.shortcuts}</div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {[
                    [t.shortcutsTools, t.shortcutsToolsKeys],
                    [t.shortcutsEdit, t.shortcutsEditKeys],
                    [t.shortcutsView, t.shortcutsViewKeys],
                  ].map(([label, keys]) => (
                    <div key={label}>
                      <div className="text-[10.5px] font-bold text-text-tertiary uppercase">{label}</div>
                      <div className="text-[11px] leading-relaxed text-text-secondary">{keys}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassPanel>
        )}

        <div className="h-1" />

        {canEdit ? (
          <button
            type="button"
            aria-label={t.clearBoard}
            onClick={onAskClear}
            className="flex items-center justify-center gap-2 rounded-[15px] border py-3.5 text-[13px] font-extrabold text-danger transition hover:brightness-95"
            style={{ borderColor: 'rgba(229,72,77,0.28)', background: Colors.dangerSoft }}
          >
            <Icon name="trash" size={17} />
            {t.clearBoard}
          </button>
        ) : null}

        {isCreator ? (
          <Button
            label={t.deleteBoard}
            icon="x-circle"
            variant="danger"
            onClick={onAskDelete}
            fullWidth
          />
        ) : null}
      </div>
    </Sheet>
  );
}
