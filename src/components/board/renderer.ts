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
import { SHAPE_TEXT_SIZE, type BoardElement, type ShapeElement, type TextElement } from '../../lib/contract';
import {
  anchorsOf,
  dashIntervals,
  elementBounds,
  endAngles,
  handlesOf,
  headsOf,
  isLineLike,
  markerPaths,
  routePath,
  shapeBounds,
  strokePath,
  type Bounds,
} from '../../lib/geometry';
import { Colors, GRID, inkFor } from '../../lib/theme';
import type { Camera } from '../../features/board-store';

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

/** Font shorthand for a text element, in the app's own typeface. */
export function fontFor(el: Pick<TextElement, 'fontSize' | 'bold' | 'italic'>): string {
  return `${el.italic ? 'italic ' : ''}${el.bold ? 800 : 500} ${el.fontSize}px Nunito, system-ui, sans-serif`;
}

/** Text is drawn from its baseline, so a line sits `fontSize` below `at.y`. */
export const TEXT_LINE_HEIGHT = 1.25;

function paintText(ctx: CanvasRenderingContext2D, el: TextElement): void {
  ctx.font = fontFor(el);
  ctx.fillStyle = el.color;
  ctx.textBaseline = 'alphabetic';
  const step = el.fontSize * TEXT_LINE_HEIGHT;
  // The editor is multi-line, so a text element may hold newlines. Skia on
  // mobile draws only the first line; splitting here is a superset that renders
  // the same single-line elements identically.
  el.text.split('\n').forEach((line, i) => {
    ctx.fillText(line, el.at.x, el.at.y + el.fontSize + i * step);
  });
}

/** A shape's label: centred in its box, or floating just above a line's midpoint. */
function paintShapeLabel(ctx: CanvasRenderingContext2D, el: ShapeElement): void {
  if (!el.text) return;
  const { x, y, width, height } = shapeBounds(el);
  const fontSize = el.fontSize ?? SHAPE_TEXT_SIZE;
  const step = fontSize * TEXT_LINE_HEIGHT;
  const lines = el.text.split('\n');
  const cx = x + width / 2;
  const cy = isLineLike(el)
    ? y + height / 2 - (lines.length * step) / 2 - fontSize * 0.4
    : y + height / 2;

  ctx.font = fontFor({ fontSize, bold: false, italic: false });
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
    return;
  }

  if (el.shape === 'triangle') {
    // Apex centred on the top edge, base along the bottom — the shape the tool
    // icon promises, drawn inside the dragged box.
    const path = new Path2D();
    path.moveTo(x + w / 2, y);
    path.lineTo(x + w, y + h);
    path.lineTo(x, y + h);
    path.closePath();
    if (el.fill) {
      ctx.fillStyle = el.fill;
      ctx.fill(path);
    }
    ctx.stroke(path);
    return;
  }

  // line / arrow: the route, dashed if asked, then a marker at each end. A
  // marker is painted after the line so a hollow one hides it.
  const dash = dashIntervals(el.dash, el.strokeWidth);
  if (dash) ctx.setLineDash(dash);
  ctx.stroke(new Path2D(routePath(el.from, el.to, el.route)));
  ctx.setLineDash([]);

  const [headStart, headEnd] = headsOf(el);
  const angles = endAngles(el.from, el.to, el.route);
  const size = markerSize(el.strokeWidth);
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

/** A marker's size grows with the stroke, and never below a fingertip's worth. */
export const markerSize = (width: number) => Math.max(10, width * 3);

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

/** A dashed screen-space box round board-space bounds: the frame, and the marquee. */
export function paintDashedBox(ctx: CanvasRenderingContext2D, b: Bounds, camera: Camera): void {
  ctx.save();
  ctx.strokeStyle = Colors.accent;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
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
  if (!line) paintDashedBox(ctx, one ? elementBounds(one) : unionBounds(elements), camera);
  if (!one) return;
  ctx.save();
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
    ctx.stroke(new Path2D(routePath(line.from, line.to, line.route)));
    ctx.restore();
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
    if (el.kind !== 'shape') continue;
    for (const a of anchorsOf(el)) {
      ctx.beginPath();
      ctx.arc(a.x * camera.scale + camera.x, a.y * camera.scale + camera.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
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
    paintElement(ctx, el, opts.smooth, opts.onImageReady, opts.dark);
  }
  ctx.restore();
}
