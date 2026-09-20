/**
 * A cursor per tool.
 *
 * "Cursor cambiante según la herramienta" is in the original brief, and on a
 * pointer device it is the one affordance a phone cannot have: the tool in your
 * hand is visible *at the place you are about to use it*, so nobody has to look
 * across at the rail to remember what a click will do.
 *
 * Each is the tool's own glyph from `ui/Icon.tsx`, drawn white-on-ink so it
 * stays visible over any colour on the board, with a hotspot on the working
 * point — the pencil's tip, the middle of the eraser, the crosshair centre.
 */
import type { ToolType } from '../../lib/contract';

/** A stroked glyph with a white halo under it, so it reads on any background. */
function cursor(body: string, hotX: number, hotY: number, size = 26): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
<g fill="none" stroke="#FFFFFF" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">${body}</g>
<g fill="none" stroke="#1B2030" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g>
</svg>`;
  const scale = size / 24;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${Math.round(hotX * scale)} ${Math.round(hotY * scale)}, crosshair`;
}

const CROSSHAIR = '<path d="M12 4v6"/><path d="M12 14v6"/><path d="M4 12h6"/><path d="M14 12h6"/>';

const PENCIL = cursor(
  '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
  4,
  20,
);

const ERASER = cursor(
  '<rect x="3" y="11" width="13" height="9" rx="2" transform="rotate(-38 9.5 15.5)"/><path d="M10 20h10"/>',
  6,
  18,
);

/** Shapes are dragged corner to corner, so the hotspot is the crosshair centre. */
const SHAPE = cursor(CROSSHAIR, 12, 12);

const TEXT = cursor('<path d="M5 6h14"/><path d="M12 6v13"/><path d="M9 19h6"/>', 12, 6);

const FILL = cursor(
  '<path d="M12 3.5c3.2 3.6 5.5 6.3 5.5 9a5.5 5.5 0 0 1-11 0c0-2.7 2.3-5.4 5.5-9z"/><path d="M9.4 13.6a2.7 2.7 0 0 0 2.6 2.6"/>',
  12,
  20,
);

const BY_TOOL: Record<ToolType, string> = {
  hand: 'grab',
  select: 'default',
  pen: PENCIL,
  eraser: ERASER,
  shape: SHAPE,
  text: TEXT,
  fill: FILL,
};

/**
 * `canEdit` false means the board is read-only: the default arrow says "there
 * is nothing to do here" more honestly than a pencil that draws nothing.
 * `panning` overrides everything — while the canvas is being dragged, the tool
 * is irrelevant.
 */
export function cursorFor(tool: ToolType, canEdit: boolean, panning: boolean): string {
  if (panning) return 'grabbing';
  if (!canEdit) return 'default';
  return BY_TOOL[tool];
}
