/**
 * The right-click menu: what the options strip used to carry besides style —
 * copy, cut, paste, duplicate, stacking order, group — so the strip can stay
 * small. Over an element it acts on the selection; over empty board it offers
 * paste and select all.
 */
import { useEffect, useRef } from 'react';

import { copyToSystem, pasteFromSystem } from '../../features/board-clipboard';
import { useBoardStore, type ReorderOp } from '../../features/board-store';
import { useT } from '../../features/i18n';
import { useEscape } from '../../hooks/use-escape';
import type { StringKey } from '../../features/strings';
import type { Point } from '../../lib/contract';
import { toast } from '../../lib/toast';
import { GlassPanel } from '../ui/Glass';
import { Icon, type IconName } from '../ui/Icon';

const WIDTH = 220;
const ROW_MOUSE = 36;
const ROW_TOUCH = 44;

export interface MenuSpot {
  /** Client (screen) position of the click. */
  x: number;
  y: number;
  /** The same spot on the board: where a paste lands. */
  at: Point;
  /** A locked element under the click, offered for unlocking. */
  locked?: string;
}

export function ContextMenu({ spot, onClose }: { spot: MenuSpot; onClose: () => void }) {
  const t = useT();
  const s = useBoardStore.getState();
  const selected = s.selectedElements();
  const has = selected.length > 0;
  const groupable = new Set(selected.map((el) => el.group ?? el.id)).size > 1;
  const grouped = selected.some((el) => !!el.group);

  const ROW = window.matchMedia('(pointer: coarse)').matches ? ROW_TOUCH : ROW_MOUSE;
  useEscape(true, onClose);

  // Keyboard: focus lands on the first item, arrows / Home / End move between
  // them, Tab leaves the menu closed behind it.
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, []);
  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === 'ArrowDown' ? (at + 1) % items.length
      : e.key === 'ArrowUp' ? (at - 1 + items.length) % items.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? items.length - 1
      : -1;
    if (e.key === 'Tab') onClose();
    if (next < 0) return;
    e.preventDefault();
    items[next]?.focus();
  };

  type Row = { icon: IconName; label: StringKey; run: () => void; danger?: boolean } | 'line';
  const order = (op: ReorderOp, icon: IconName, label: StringKey): Row => ({
    icon,
    label,
    run: () => s.reorder(op),
  });
  const rows: Row[] = has
    ? [
        {
          icon: 'copy',
          label: 'copy',
          run: () => {
            s.copySelection();
            copyToSystem();
            toast(t.toastCopiedSelection);
          },
        },
        {
          icon: 'cut',
          label: 'cut',
          run: () => {
            s.cutSelection();
            copyToSystem();
          },
        },
        { icon: 'paste', label: 'paste', run: () => void pasteFromSystem(spot.at) },
        { icon: 'plus', label: 'duplicate', run: () => s.duplicateSelection() },
        'line',
        order('front', 'to-front', 'toFront'),
        order('forward', 'forward', 'forward'),
        order('backward', 'backward', 'backward'),
        order('back', 'to-back', 'toBack'),
        ...(groupable || grouped ? (['line'] as Row[]) : []),
        ...(groupable ? [{ icon: 'group', label: 'group', run: () => s.group() } as Row] : []),
        ...(grouped ? [{ icon: 'ungroup', label: 'ungroup', run: () => s.ungroup() } as Row] : []),
        'line',
        { icon: 'lock', label: 'lock', run: () => s.lockSelection() },
        { icon: 'trash', label: 'remove', run: () => s.deleteSelection(), danger: true },
      ]
    : [
        ...(spot.locked ? [{ icon: 'lock-open', label: 'unlock', run: () => s.unlock(spot.locked!) } as Row] : []),
        { icon: 'paste', label: 'paste', run: () => void pasteFromSystem(spot.at) },
        { icon: 'board', label: 'selectAll', run: () => s.selectAll() },
      ];

  const height = rows.reduce((sum, r) => sum + (r === 'line' ? 9 : ROW), 12);
  const left = Math.max(8, Math.min(spot.x, window.innerWidth - WIDTH - 8));
  const top = Math.max(8, Math.min(spot.y, window.innerHeight - height - 8));

  return (
    <div
      className="fixed inset-0 z-40"
      onPointerDown={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <GlassPanel
        radius={14}
        className="absolute shadow-panel"
        style={{ left, top, width: WIDTH, padding: 6 }}
      >
        <div ref={menu} role="menu" aria-label={t.contextMenu} onKeyDown={onMenuKey} onPointerDown={(e) => e.stopPropagation()}>
          {rows.map((row, i) =>
            row === 'line' ? (
              <div key={i} className="mx-1 my-1 h-px bg-line" />
            ) : (
              <button
                key={row.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  row.run();
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-[10px] px-3 text-left text-[0.875rem] font-semibold transition hover:bg-surface-selected focus-visible:bg-surface-selected ${
                  row.danger ? 'text-danger' : 'text-text'
                }`}
                style={{ height: ROW }}
              >
                <Icon name={row.icon} size={18} />
                {t[row.label]}
              </button>
            ),
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
