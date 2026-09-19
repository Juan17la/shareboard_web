/**
 * The zoom readout and the undo/redo pair, floating at the bottom-left, just
 * above the toolbar's row so the two never overlap on a narrow screen.
 *
 * The zoom chip doubles as its own reset — the design's "100%" button snaps the
 * camera home, which is the only way back after a long pan on an infinite
 * canvas. Ctrl/⌘ + Z and Ctrl/⌘ + Shift + Z do what the buttons do.
 */
import { useEffect } from 'react';

import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { Colors } from '../../lib/theme';

import { GlassPanel } from '../ui/Glass';
import { Icon } from '../ui/Icon';

export function BottomControls({ compact }: { compact: boolean }) {
  const t = useT();
  const camera = useBoardStore((s) => s.camera);
  const setCamera = useBoardStore((s) => s.setCamera);
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);
  const undoDepth = useBoardStore((s) => s.undoStack.length);
  const redoDepth = useBoardStore((s) => s.redoStack.length);
  const canEdit = useBoardStore((s) => s.canEditNow());
  // The toolbar's options strip opens in the same row; step over it.
  const optionsOpen = useBoardStore((s) => s.railOpen && s.canEditNow());

  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit, undo, redo]);

  const zoom = `${Math.round(camera.scale * 100)}%`;
  const homeCamera = useBoardStore((s) => s.homeCamera);
  const at = homeCamera();
  const home = camera.x === at.x && camera.y === at.y && camera.scale === 1;

  return (
    <div
      className="absolute left-3 z-30 flex flex-row items-end gap-2.5 sm:left-4"
      style={{ bottom: (compact ? 74 : 82) + (optionsOpen ? 56 : 0) }}
    >
      <GlassPanel level="chip" radius={14} border="rgba(255,255,255,0.6)">
        <button
          type="button"
          aria-label={`${t.resetZoom} (${zoom})`}
          title={t.resetZoom}
          disabled={home}
          onClick={() => setCamera(homeCamera())}
          className="flex items-center gap-1.5 px-[11px] py-2 transition hover:bg-white/70 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <Icon name="search" size={14} />
          <span className="font-mono text-[11.5px] font-bold">{zoom}</span>
        </button>
      </GlassPanel>

      {canEdit ? (
        <GlassPanel level="chip" radius={18} border="rgba(255,255,255,0.6)">
          <div className="flex gap-1 p-[5px]">
            <HistoryButton
              icon="undo"
              label={t.undo}
              hint="Ctrl+Z"
              enabled={undoDepth > 0}
              onClick={undo}
            />
            <HistoryButton
              icon="redo"
              label={t.redo}
              hint="Ctrl+Shift+Z"
              enabled={redoDepth > 0}
              onClick={redo}
            />
          </div>
        </GlassPanel>
      ) : null}
    </div>
  );
}

function HistoryButton({
  icon,
  label,
  hint,
  enabled,
  onClick,
}: {
  icon: 'undo' | 'redo';
  label: string;
  hint: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label}  (${hint})`}
      disabled={!enabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-[14px] transition hover:bg-white/70 disabled:hover:bg-transparent"
      style={{ color: enabled ? Colors.text : 'rgba(27,32,48,0.25)' }}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
