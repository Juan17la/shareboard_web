/**
 * Painting the board onto a 2D canvas.
 *
 * One module, used twice: the live board draws through `paintBoard` on every
 * frame, and the export draws through the same function into an offscreen
 * canvas — so what is downloaded is what was on screen, by construction rather
 * than by two implementations agreeing.
 *
 * Everything here is in board coordinates; the caller sets the camera transform
 * before calling. The one exception is the dot grid, which is spaced in screen
 * pixels so it stays crisp instead of being scaled with the drawing.
 */
import {
  SHAPE_TEXT_SIZE,
  type BoardElement,
  type ShapeElement,
  type TextElement,
} from '../../lib/contract';
import {
  anchorsOf,
  bendHandleOf,
  curveHandlesOf,
  boxOf,
  canRotate,
  dashIntervals,
  elementBounds,
  endAngles,
  handlesOf,
  headsOf,
  isLineLike,
  labelBox,
  labelLines,
  lineLabelCentre,
  markerPaths,
  polygonPoints,
  rotateHandleOf,
  rotationOf,
  routePath,
  setTextMeasure,
  shapeBounds,
  strokePath,
  textLines,
  toWorld,
  TEXT_LINE_HEIGHT,
  type Bounds,
} from '../../lib/geometry';
import { FONT_FAMILIES, markerSize } from '../../lib/svg';
import { Colors, GRID, inkFor } from '../../lib/theme';
import type { Camera } from '../../features/board-store';
import type { Participant } from '../../lib/contract';

// --- images ----------------------------------------------------------------
// An image element carries its bytes as a data: URI, and decoding is async. The
// cache holds the decoded bitmap so a redraw does not restart the decode, and
// the `onReady` callback is what re-runs the paint once the first decode lands.

const images = new Map<string, HTMLImageElement | 'loading'>();

export function imageFor(uri: string, onReady: () => void): HTMLImageElement | null {
  const cached = images.get(uri);
  if (cached === 'loading') return null;
  if (cached) return cached;

  images.set(uri, 'loading');
  const img = new Image();
  img.decoding = 'async';
  // A data: URI needs no CORS dance; a remote URL does, or the canvas taints
  // and `toBlob` refuses to export.
  if (!uri.startsWith('data:')) img.crossOrigin = 'anonymous';
  img.onload = () => {
    images.set(uri, img);
    onReady();
  };
  img.onerror = () => {
    // Leave it marked loading: a broken URI must not retry on every frame.
  };
  img.src = uri;
  return null;
}

/** Font shorthand for a text element or a label, in its typeface. */
export function fontFor(el: Pick<TextElement, 'fontSize' | 'bold' | 'italic' | 'font'>): string {
  return `${el.italic ? 'italic ' : ''}${el.bold ? 800 : 500} ${el.fontSize}px ${FONT_FAMILIES[el.font ?? 'sans']}`;
}

export { FONT_FAMILIES, markerSize, TEXT_LINE_HEIGHT };

// Geometry measures text (bounds, wrapping, hit tests) with the same font the
// board paints it in.
const measurer = document.createElement('canvas').getContext('2d');
const measure = (text: string, font: Parameters<typeof fontFor>[0]) => {
  measurer!.font = fontFor(font);
  return measurer!.measureText(text).width;
};
if (measurer) {
  setTextMeasure(measure);
  // A typeface arriving changes every width measured with its fallback.
  document.fonts?.addEventListener('loadingdone', () => setTextMeasure(measure));
}

function paintText(ctx: CanvasRenderingContext2D, el: TextElement): void {
  ctx.font = fontFor(el);
  ctx.fillStyle = el.color;
  ctx.textBaseline = 'alphabetic';
  const step = el.fontSize * TEXT_LINE_HEIGHT;
  // Its own newlines, then wrapped to its width if it has one.
  textLines(el).forEach((line, i) => {
    ctx.fillText(line, el.at.x, el.at.y + el.fontSize + i * step);
  });
}

/** A shape's label: centred in its box, or floating just above a line's midpoint. */
function paintShapeLabel(ctx: CanvasRenderingContext2D, el: ShapeElement): void {
  if (!el.text) return;
  const { x, y, width, height } = shapeBounds(el);
  const fontSize = el.fontSize ?? SHAPE_TEXT_SIZE;
  const step = fontSize * TEXT_LINE_HEIGHT;
  const lines = labelLines(el, fontSize);
  // Centred in a box; on a line, where it stands along it (the line is cut behind it).
  const { x: cx, y: cy } = isLineLike(el) ? lineLabelCentre(el) : { x: x + width / 2, y: y + height / 2 };

  ctx.font = fontFor({ fontSize, bold: false, italic: false, font: el.font });
  ctx.fillStyle = el.stroke;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const top = cy - ((lines.length - 1) * step) / 2;
  lines.forEach((line, i) => ctx.fillText(line, cx, top + i * step));
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

function paintShape(ctx: CanvasRenderingContext2D, el: ShapeElement): void {
  paintShapeGeometry(ctx, el);
  paintShapeLabel(ctx, el);
}

function paintShapeGeometry(ctx: CanvasRenderingContext2D, el: ShapeElement): void {
  const x = Math.min(el.from.x, el.to.x);
  const y = Math.min(el.from.y, el.to.y);
  const w = Math.abs(el.to.x - el.from.x);
  const h = Math.abs(el.to.y - el.from.y);

  ctx.strokeStyle = el.stroke;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Closed shapes dash their outline; the line below does it for its own route.
  const outline = dashIntervals(el.dash, el.strokeWidth);
  if (outline) ctx.setLineDash(outline);

  if (el.shape === 'rectangle') {
    // The design's rectangles are softly rounded, capped so a thin sliver does
    // not turn into a lozenge.
    const r = Math.max(0, Math.min(8, w / 4, h / 4));
    const path = new Path2D();
    path.roundRect(x, y, w, h, r);
    if (el.fill) {
      ctx.fillStyle = el.fill;
      ctx.fill(path);
    }
    ctx.stroke(path);
    ctx.setLineDash([]);
    return;
  }

  if (el.shape === 'ellipse') {
    const path = new Path2D();
    path.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (el.fill) {
      ctx.fillStyle = el.fill;
      ctx.fill(path);
    }
    ctx.stroke(path);
    ctx.setLineDash([]);
    return;
  }

  if (el.shape === 'triangle' || el.shape === 'polygon') {
    // A triangle: apex centred on the top edge, base along the bottom — the
    // shape the tool icon promises. A polygon: regular, first corner up.
    const pts =
      el.shape === 'triangle'
        ? [
            { x: x + w / 2, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
          ]
        : polygonPoints({ x, y, width: w, height: h }, el.sides);
    const path = new Path2D();
    pts.forEach((p, i) => (i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)));
    path.closePath();
    if (el.fill) {
      ctx.fillStyle = el.fill;
      ctx.fill(path);
    }
    ctx.stroke(path);
    ctx.setLineDash([]);
    return;
  }

  // line / arrow: the route, dashed if asked, then a marker at each end. A
  // marker is painted after the line so a hollow one hides it.
  const dash = dashIntervals(el.dash, el.strokeWidth);
  // The line is cut away behind its label, so the text sits in it: clip to
  // everything but the label's box.
  const labelSize = el.fontSize ?? SHAPE_TEXT_SIZE;
  const gap = el.text ? labelBox(el, labelLines(el, labelSize), labelSize) : null;
  if (gap) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-1e7, -1e7, 2e7, 2e7);
    ctx.rect(gap.x, gap.y, gap.width, gap.height);
    ctx.clip('evenodd');
  }
  if (dash) ctx.setLineDash(dash);
  ctx.stroke(new Path2D(routePath(el)));
  ctx.setLineDash([]);
  if (gap) ctx.restore();

  const [headStart, headEnd] = headsOf(el);
  const angles = endAngles(el);
  const size = markerSize(el.strokeWidth);
  // Sharp tips, not the line's soft join: a crow's foot or a chevron rounded
  // off at the point reads as a blob rather than an arrowhead.
  ctx.lineJoin = 'miter';
  for (const [kind, tip, angle] of [
    [headStart, el.from, angles.start],
    [headEnd, el.to, angles.end],
  ] as const) {
    for (const part of markerPaths(kind, tip, angle, size)) {
      const path = new Path2D(part.d);
      if (part.fill !== 'none') {
        ctx.fillStyle = part.fill === 'solid' ? el.stroke : ground;
        ctx.fill(path);
      }
      ctx.stroke(path);
    }
  }
}


/** What a hollow marker is filled with: the surface the frame is painted on. */
let ground = '#FFFFFF';

/**
 * The element as it is painted on the dark board: the default ink swapped for
 * the dark theme's text colour (`inkFor`). The element itself is untouched.
 */
function inked(el: BoardElement): BoardElement {
  switch (el.kind) {
    case 'stroke':
    case 'text':
      return { ...el, color: inkFor(el.color, true) };
    case 'shape':
      return { ...el, stroke: inkFor(el.stroke, true), fill: el.fill && inkFor(el.fill, true) };
    default:
      return el;
  }
}

/** Renders one board element. */
export function paintElement(
  ctx: CanvasRenderingContext2D,
  el: BoardElement,
  smooth: boolean,
  onImageReady: () => void,
  dark = false,
): void {
  if (dark) el = inked(el);
  const angle = rotationOf(el);
  if (angle) {
    // Turned about the centre of its box: everything below paints unturned.
    const b = boxOf(el);
    ctx.save();
    ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
    ctx.rotate(angle);
    ctx.translate(-(b.x + b.width / 2), -(b.y + b.height / 2));
    paintElement(ctx, { ...el, rotation: 0 }, smooth, onImageReady);
    ctx.restore();
    return;
  }
  switch (el.kind) {
    case 'stroke': {
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(strokePath(el.points, smooth));
      break;
    }
    case 'shape':
      paintShape(ctx, el);
      break;
    case 'text':
      paintText(ctx, el);
      break;
    case 'image': {
      const img = imageFor(el.uri, onImageReady);
      if (img) ctx.drawImage(img, el.at.x, el.at.y, el.width, el.height);
      break;
    }
  }
}

/**
 * The dot grid the settings sheet can turn off.
 *
 * Drawn in screen space as one path of small arcs. Below ~9px apart the dots
 * read as a grey wash, so the grid drops out — the same threshold the design
 * uses when zoomed out.
 */
export function paintGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Camera,
): void {
  const step = GRID.step * camera.scale;
  if (step <= GRID.minScreenStep) return;

  const radius = camera.scale > 1.4 ? 1.4 : 1.1;
  const path = new Path2D();
  const startX = ((camera.x % step) + step) % step;
  const startY = ((camera.y % step) + step) % step;
  for (let x = startX; x < width; x += step) {
    for (let y = startY; y < height; y += step) {
      path.moveTo(x + radius, y);
      path.arc(x, y, radius, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = Colors.borderStrong;
  ctx.fill(path);
}

/**
 * The selection frame: a dashed box round the selection and, for a single
 * element, a handle on each corner (each endpoint for a line), drawn in screen
 * space so the handles stay finger-sized at any zoom. `camera` maps board
 * coordinates onto the screen.
 */
export const HANDLE_SIZE = 10;

/**
 * A dashed screen-space box round board-space bounds: the frame, and the
 * marquee. `angle` turns it about its centre, for a single turned element.
 */
export function paintDashedBox(
  ctx: CanvasRenderingContext2D,
  b: Bounds,
  camera: Camera,
  angle = 0,
): void {
  ctx.save();
  ctx.strokeStyle = Colors.accent;
  paintFrame(ctx, b, camera, angle);
  ctx.restore();
}

/** The dashed frame itself, in the current stroke colour. */
function paintFrame(ctx: CanvasRenderingContext2D, b: Bounds, camera: Camera, angle: number): void {
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  if (angle) {
    const cx = (b.x + b.width / 2) * camera.scale + camera.x;
    const cy = (b.y + b.height / 2) * camera.scale + camera.y;
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }
  ctx.strokeRect(
    b.x * camera.scale + camera.x - 4,
    b.y * camera.scale + camera.y - 4,
    b.width * camera.scale + 8,
    b.height * camera.scale + 8,
  );
  ctx.restore();
}

function unionBounds(elements: BoardElement[]): Bounds {
  const boxes = elements.map(elementBounds);
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
  };
}

export function paintSelection(
  ctx: CanvasRenderingContext2D,
  elements: BoardElement[],
  camera: Camera,
): void {
  const one = elements.length === 1 ? elements[0] : null;
  const line = one?.kind === 'shape' && isLineLike(one) ? one : null;
  if (!line) {
    // One turnable element is framed along its own (turned) box.
    if (one && canRotate(one)) paintDashedBox(ctx, boxOf(one), camera, rotationOf(one));
    else paintDashedBox(ctx, one ? elementBounds(one) : unionBounds(elements), camera);
  }
  if (!one) return;
  ctx.save();
  // The rotate knob: a round handle on a short stem above the top edge.
  const knob = rotateHandleOf(one, camera.scale);
  if (knob) {
    const b = boxOf(one);
    const top = toWorld(one, { x: b.x + b.width / 2, y: b.y });
    const sx = knob.x * camera.scale + camera.x;
    const sy = knob.y * camera.scale + camera.y;
    ctx.strokeStyle = Colors.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(top.x * camera.scale + camera.x, top.y * camera.scale + camera.y);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.fillStyle = Colors.background;
    ctx.beginPath();
    ctx.arc(sx, sy, HANDLE_SIZE / 2 + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (line) {
    // A line has no box to frame, so the line itself lights up: a soft accent
    // halo along its route, and round handles at the two ends it can be
    // dragged by — unmistakably not the square corners of a box.
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);
    ctx.strokeStyle = Colors.accent;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = line.strokeWidth + 8 / camera.scale;
    ctx.lineCap = 'round';
    ctx.stroke(new Path2D(routePath(line)));
    ctx.restore();
    // The label is held by its own frame: drag it to move it along the line.
    if (line.text) {
      const size = line.fontSize ?? SHAPE_TEXT_SIZE;
      paintDashedBox(ctx, labelBox(line, labelLines(line, size), size), camera);
    }
  }
  ctx.strokeStyle = Colors.accent;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = line ? Colors.accent : Colors.background;
  for (const h of handlesOf(one)) {
    const sx = h.x * camera.scale + camera.x;
    const sy = h.y * camera.scale + camera.y;
    ctx.beginPath();
    if (line) ctx.arc(sx, sy, HANDLE_SIZE / 2 + 1, 0, Math.PI * 2);
    else ctx.rect(sx - HANDLE_SIZE / 2, sy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.fill();
    ctx.stroke();
  }
  // A curved or elbow line's fold: a diamond handle, dragged to reshape how
  // far it bows or where it turns.
  const curve = line ? curveHandlesOf(line) : null;
  // A curve's pull at each end: a round handle on a stem out of the end it
  // shapes — drag it to change which way the line leaves, and how hard.
  if (line && curve) {
    ctx.fillStyle = Colors.background;
    for (const [end, handle] of [
      [line.from, curve.start],
      [line.to, curve.end],
    ] as const) {
      const ex = end.x * camera.scale + camera.x;
      const ey = end.y * camera.scale + camera.y;
      const hx = handle.x * camera.scale + camera.x;
      const hy = handle.y * camera.scale + camera.y;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_SIZE / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  const fold = curve ? curve.mid : line ? bendHandleOf(line) : null;
  if (fold) {
    const sx = fold.x * camera.scale + camera.x;
    const sy = fold.y * camera.scale + camera.y;
    ctx.fillStyle = Colors.background;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.rect(-HANDLE_SIZE / 2, -HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Connection points on every enclosed shape, shown while a line or an arrow is
 * being drawn so the snap targets are visible. Screen-space dots.
 */
export function paintAnchors(
  ctx: CanvasRenderingContext2D,
  elements: BoardElement[],
  camera: Camera,
): void {
  ctx.save();
  ctx.fillStyle = Colors.background;
  ctx.strokeStyle = Colors.accent;
  ctx.lineWidth = 1.5;
  for (const el of elements) {
    for (const a of anchorsOf(el)) {
      ctx.beginPath();
      ctx.arc(a.x * camera.scale + camera.x, a.y * camera.scale + camera.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** How opaque an element someone else holds is painted. */
export const HELD_ALPHA = 0.45;
/** What the eraser is about to take: faint enough to read as going, visible enough to see what. */
export const ERASING_ALPHA = 0.25;

/**
 * Who holds what: a dashed frame in the holder's presence colour round each
 * element someone else has selected, and their name on a tag above it — the
 * same colour and name as their cursor. Screen space, like the selection.
 */
export function paintHeld(
  ctx: CanvasRenderingContext2D,
  elements: BoardElement[],
  held: ReadonlyMap<string, Participant>,
  camera: Camera,
): void {
  const tagged = new Set<string>();
  for (const el of elements) {
    const who = held.get(el.id);
    if (!who) continue;
    const b = canRotate(el) ? boxOf(el) : elementBounds(el);
    ctx.save();
    ctx.strokeStyle = who.color;
    paintFrame(ctx, b, camera, canRotate(el) ? rotationOf(el) : 0);
    ctx.restore();
    // One tag per holder is enough; more would stack on a held group.
    if (tagged.has(who.userId)) continue;
    tagged.add(who.userId);
    const top = elementBounds(el);
    const x = top.x * camera.scale + camera.x - 4;
    const y = top.y * camera.scale + camera.y - 8;
    ctx.save();
    ctx.font = '800 11px Nunito, system-ui, sans-serif';
    const w = ctx.measureText(who.nickname).width + 12;
    ctx.fillStyle = who.color;
    ctx.beginPath();
    ctx.roundRect(x, y - 18, w, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(who.nickname, x + 6, y - 9);
    ctx.restore();
  }
}

export interface PaintOptions {
  elements: BoardElement[];
  camera: Camera;
  /** CSS pixel size of the surface. */
  width: number;
  height: number;
  smooth: boolean;
  grid: boolean;
  /** Painted before anything else; `null` leaves the surface transparent. */
  background: string | null;
  /** The dark board: the default ink is painted light so it stays visible. */
  dark?: boolean;
  /** Elements someone else holds (has selected): painted dimmed. */
  held?: ReadonlyMap<string, unknown>;
  /** What the eraser has passed over and will delete on lift: painted faded. */
  erasing?: readonly string[];
  onImageReady: () => void;
}

/** Paints a whole frame: background, grid, then every element in paint order. */
export function paintBoard(ctx: CanvasRenderingContext2D, opts: PaintOptions): void {
  const { camera, width, height } = opts;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  }
  if (opts.grid) paintGrid(ctx, width, height, camera);
  ground = opts.background ?? '#FFFFFF';

  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.scale, camera.scale);
  for (const el of opts.elements) {
    const fade = opts.erasing?.includes(el.id);
    const dim = fade || opts.held?.has(el.id);
    if (dim) ctx.globalAlpha = fade ? ERASING_ALPHA : HELD_ALPHA;
    paintElement(ctx, el, opts.smooth, opts.onImageReady, opts.dark);
    if (dim) ctx.globalAlpha = 1;
  }
  ctx.restore();
}
