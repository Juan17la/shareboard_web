/**
 * The camera and history controls: zoom out / readout / zoom in, then undo and
 * redo, in one glass chip at the top-right of the board, on every screen size.
 * Up there they are out of the way of the hand that draws and of the toolbar
 * at the bottom, and they read the same on a phone and a monitor.
 *
 * The readout doubles as the reset — the design's "100%" button snaps the
 * camera home, which is the only way back after a long pan on an infinite
 * canvas. The keyboard shortcuts live in `hooks/use-shortcuts.ts`.
 */
import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { ZOOM_STEP } from '../../lib/geometry';
import { Css } from '../../lib/theme';

import { GlassPanel } from '../ui/Glass';
import { Icon, type IconName } from '../ui/Icon';

export function BottomControls({ top, onOpenAi }: { top: number; onOpenAi: () => void }) {
  const t = useT();
  const camera = useBoardStore((s) => s.camera);
  const setCamera = useBoardStore((s) => s.setCamera);
  const zoomBy = useBoardStore((s) => s.zoomBy);
  const homeCamera = useBoardStore((s) => s.homeCamera);
  const fitCamera = useBoardStore((s) => s.fitCamera);
  const hasContent = useBoardStore((s) => Object.values(s.elements).some((el) => !el.deleted));
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);
  const undoDepth = useBoardStore((s) => s.undoStack.length);
  const redoDepth = useBoardStore((s) => s.redoStack.length);
  const canEdit = useBoardStore((s) => s.canEditNow());

  const zoom = `${Math.round(camera.scale * 100)}%`;
  const at = homeCamera();
  const home = camera.x === at.x && camera.y === at.y && camera.scale === 1;

  return (
    <div className="absolute right-3 z-30 sm:right-4" style={{ top }}>
      <GlassPanel level="chip" radius={14} overflow="visible" border="var(--color-glass-highlight)">
        <div className="flex items-center gap-0.5 p-1">
          <ControlButton icon="minus" label={t.zoomOut} hint="Ctrl −" enabled={camera.scale > 0.25} onClick={() => zoomBy(1 / ZOOM_STEP)} />
          <button
            type="button"
            aria-label={`${t.resetZoom} (${zoom})`}
            data-tip={`${t.resetZoom} · Ctrl 0`}
            data-tip-side="bottom"
            disabled={home}
            onClick={() => setCamera(homeCamera())}
            className="touch-36 h-[30px] min-w-[46px] rounded-[10px] px-1 font-mono text-[0.75rem] font-bold transition hover:bg-surface-selected disabled:cursor-default disabled:hover:bg-transparent"
          >
            {zoom}
          </button>
          <ControlButton icon="plus" label={t.zoomIn} hint="Ctrl +" enabled={camera.scale < 6} onClick={() => zoomBy(ZOOM_STEP)} />
          <ControlButton icon="fit" label={t.fitContent} hint="Shift 1" enabled={hasContent} onClick={fitCamera} />

          {canEdit ? (
            <>
              <span className="mx-1 h-5 w-px bg-line" />
              <ControlButton icon="undo" label={t.undo} hint="Ctrl Z" enabled={undoDepth > 0} onClick={undo} />
              <ControlButton icon="redo" label={t.redo} hint="Ctrl Y" enabled={redoDepth > 0} onClick={redo} />
              <span className="mx-1 h-5 w-px bg-line" />
              <ControlButton icon="sparkle" label={t.sheetAi} hint="AI" enabled accent onClick={onOpenAi} />
            </>
          ) : null}
        </div>
      </GlassPanel>
    </div>
  );
}

function ControlButton({
  icon,
  label,
  hint,
  enabled,
  accent = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  hint: string;
  enabled: boolean;
  /** Lit in the brand colour so the one entry point to AI is easy to spot. */
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={`${label} · ${hint}`}
      data-tip-side="bottom"
      disabled={!enabled}
      onClick={onClick}
      className={`touch-36 flex h-[30px] w-[30px] items-center justify-center rounded-[10px] transition disabled:hover:bg-transparent ${
        accent
          ? 'bg-accent text-white shadow-accent hover:bg-accent-deep'
          : 'hover:bg-surface-selected'
      }`}
      style={accent ? undefined : { color: enabled ? Css.text : Css.borderDashed }}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
