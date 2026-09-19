/**
 * Stroke geometry: turning the flat `[x0, y0, x1, y1, ...]` buffer a gesture
 * produces into something drawable, and measuring what is on the board.
 *
 * A pointer emits a point every frame, which gives two problems. There are far
 * more points than the shape needs — so `simplify` drops the ones that carry no
 * information before the stroke is stored and sent over the network — and
 * joining the survivors with straight lines looks visibly faceted. So
 * `strokePath` fits a curve through them instead (Catmull-Rom, converted to the
 * cubic Béziers `Path2D` understands), which is what keeps freehand lines
 * smooth: the "minimizar líneas entrecortadas" requirement in mobile/docs/01.
 */
import type { BoardElement, Point, ShapeElement } from './contract';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function flatToPoints(flat: number[]): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < flat.length - 1; i += 2) points.push({ x: flat[i], y: flat[i + 1] });
  return points;
}

/** Drops points closer than `min` px to the last kept one. */
export function simplify(flat: number[], min = 1.5): number[] {
  if (flat.length <= 4) return flat;

  const out = [flat[0], flat[1]];
  const min2 = min * min;
  for (let i = 2; i < flat.length - 1; i += 2) {
    const dx = flat[i] - out[out.length - 2];
    const dy = flat[i + 1] - out[out.length - 1];
    if (dx * dx + dy * dy >= min2) out.push(flat[i], flat[i + 1]);
  }
  // The last point is where the pointer actually lifted, so it always survives.
  out.push(flat[flat.length - 2], flat[flat.length - 1]);
  return out;
}

/**
 * `smooth` is the settings-sheet switch. Off, the points are joined with
 * straight segments — faster, and closer to what was literally drawn, which a
 * few people prefer for diagrams; on (the default) they are curve-fitted.
 *
 * Returns a `Path2D` rather than a string: the canvas renderer strokes the same
 * element on every frame, and a path object can be cached and reused where a
 * string has to be re-parsed each time.
 */
export function strokePath(flat: number[], smooth = true): Path2D {
  const path = new Path2D();
  const p = flatToPoints(flat);
  if (p.length === 0) return path;

  path.moveTo(p[0].x, p[0].y);
  // A tap has nowhere to curve to; the zero-length line still paints a round cap.
  if (p.length === 1) {
    path.lineTo(p[0].x, p[0].y);
    return path;
  }
  if (p.length === 2 || !smooth) {
    for (let i = 1; i < p.length; i++) path.lineTo(p[i].x, p[i].y);
    return path;
  }

  for (let i = 0; i < p.length - 1; i++) {
    // Each segment is steered by its neighbours, so the curve stays continuous
    // across joins. The ends have no outer neighbour and reuse the endpoint.
    const prev = p[i - 1] ?? p[i];
    const from = p[i];
    const to = p[i + 1];
    const next = p[i + 2] ?? to;

    // Catmull-Rom -> Bézier: the control points sit a sixth of the way along
    // the neighbouring chord, which is the standard uniform conversion.
    path.bezierCurveTo(
      from.x + (to.x - prev.x) / 6,
      from.y + (to.y - prev.y) / 6,
      to.x - (next.x - from.x) / 6,
      to.y - (next.y - from.y) / 6,
      to.x,
      to.y,
    );
  }
  return path;
}

/**
 * Bounding box of everything drawn, or null when the board is empty. Used to
 * frame an export tightly instead of shipping the whole infinite canvas.
 * Strokes and shapes are grown by half their stroke width, since a line is
 * painted centred on its path and would otherwise be clipped in half.
 */
export function contentBounds(elements: BoardElement[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const grow = (x: number, y: number, pad = 0) => {
    if (x - pad < minX) minX = x - pad;
    if (y - pad < minY) minY = y - pad;
    if (x + pad > maxX) maxX = x + pad;
    if (y + pad > maxY) maxY = y + pad;
  };

  for (const el of elements) {
    switch (el.kind) {
      case 'stroke': {
        const pad = el.width / 2;
        for (let i = 0; i < el.points.length - 1; i += 2) grow(el.points[i], el.points[i + 1], pad);
        break;
      }
      case 'shape': {
        const pad = el.strokeWidth / 2 + (el.shape === 'arrow' ? el.strokeWidth * 3 : 0);
        grow(el.from.x, el.from.y, pad);
        grow(el.to.x, el.to.y, pad);
        break;
      }
      case 'text': {
        // Measuring text needs a canvas context this module has no access to,
        // so approximate from the glyph count — the same estimate the mobile
        // app uses, and the export pads generously around the result anyway.
        grow(el.at.x, el.at.y);
        grow(el.at.x + el.text.length * el.fontSize * 0.55, el.at.y + el.fontSize * 1.4);
        break;
      }
      case 'image':
        grow(el.at.x, el.at.y);
        grow(el.at.x + el.width, el.at.y + el.height);
        break;
    }
  }

  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Which elements sit under a point — used by the eraser and the paint bucket.
 * Strokes are tested against their points and everything else against its
 * bounding box, which is generous but matches what a pointer expects.
 */
export function hitTest(elements: BoardElement[], at: Point, radius: number): string[] {
  const r2 = radius * radius;
  const hits: string[] = [];

  const dist2 = (ax: number, ay: number, bx: number, by: number) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  };

  for (const el of elements) {
    if (el.kind === 'stroke') {
      for (let i = 0; i < el.points.length - 1; i += 2) {
        if (dist2(el.points[i], el.points[i + 1], at.x, at.y) <= r2 + el.width * el.width) {
          hits.push(el.id);
          break;
        }
      }
    } else if (el.kind === 'shape') {
      const minX = Math.min(el.from.x, el.to.x) - radius;
      const maxX = Math.max(el.from.x, el.to.x) + radius;
      const minY = Math.min(el.from.y, el.to.y) - radius;
      const maxY = Math.max(el.from.y, el.to.y) + radius;
      if (at.x >= minX && at.x <= maxX && at.y >= minY && at.y <= maxY) hits.push(el.id);
    } else {
      const w = el.kind === 'image' ? el.width : Math.max(40, el.text.length * el.fontSize * 0.55);
      const h = el.kind === 'image' ? el.height : el.fontSize * 1.4;
      if (
        at.x >= el.at.x - radius &&
        at.x <= el.at.x + w + radius &&
        at.y >= el.at.y - radius &&
        at.y <= el.at.y + h + radius
      ) {
        hits.push(el.id);
      }
    }
  }
  return hits;
}

// --- selecting and reshaping a shape ---------------------------------------
// A selected shape shows one handle per corner (two, the endpoints, for a line
// or an arrow). Dragging a handle moves that corner and pins the opposite one;
// for a line each handle simply moves its own endpoint, so the arrow head keeps
// pointing the way it was drawn.

export const isLineLike = (el: ShapeElement): boolean =>
  el.shape === 'line' || el.shape === 'arrow';

/** Normalised box of a shape. A line's box may have zero width or height. */
export function shapeBounds(el: Pick<ShapeElement, 'from' | 'to'>): Bounds {
  const x = Math.min(el.from.x, el.to.x);
  const y = Math.min(el.from.y, el.to.y);
  return { x, y, width: Math.abs(el.to.x - el.from.x), height: Math.abs(el.to.y - el.from.y) };
}

/** Handle positions, in board coordinates: TL, TR, BR, BL — or from, to. */
export function shapeHandles(el: ShapeElement): Point[] {
  if (isLineLike(el)) return [el.from, el.to];
  const b = shapeBounds(el);
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.width, y: b.y },
    { x: b.x + b.width, y: b.y + b.height },
    { x: b.x, y: b.y + b.height },
  ];
}

/** The shape's `from`/`to` after handle `h` is dragged to `p`. */
export function resizeShape(el: ShapeElement, h: number, p: Point): Pick<ShapeElement, 'from' | 'to'> {
  if (isLineLike(el)) return h === 0 ? { from: p, to: el.to } : { from: el.from, to: p };
  // Box shapes are drawn from their normalised bounds, so any corner order works.
  return { from: shapeHandles(el)[(h + 2) % 4], to: p };
}

// --- connection points -----------------------------------------------------
// Every enclosed shape offers the midpoint of each side of its box as a place a
// line or an arrow can start or end. Snapping is by proximity at draw time
// only: the arrow is not bound to the shape, so moving one leaves the other.

/** Anchor points of an enclosed shape, in board coordinates: top, right, bottom, left. */
export function anchorsOf(el: ShapeElement): Point[] {
  if (isLineLike(el)) return [];
  const b = shapeBounds(el);
  return [
    { x: b.x + b.width / 2, y: b.y },
    { x: b.x + b.width, y: b.y + b.height / 2 },
    { x: b.x + b.width / 2, y: b.y + b.height },
    { x: b.x, y: b.y + b.height / 2 },
  ];
}

/** The nearest anchor within `radius` board units of `at`, or `at` itself. */
export function snapToAnchor(elements: BoardElement[], at: Point, radius: number): Point {
  let best = at;
  let bestD = radius * radius;
  for (const el of elements) {
    if (el.kind !== 'shape') continue;
    for (const a of anchorsOf(el)) {
      const d = (a.x - at.x) ** 2 + (a.y - at.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
  }
  return best;
}

/** The topmost shape whose box (padded by `pad` board units) contains `at`. */
export function shapeAt(elements: BoardElement[], at: Point, pad: number): ShapeElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.kind !== 'shape') continue;
    const b = shapeBounds(el);
    if (
      at.x >= b.x - pad &&
      at.x <= b.x + b.width + pad &&
      at.y >= b.y - pad &&
      at.y <= b.y + b.height + pad
    ) {
      return el;
    }
  }
  return null;
}
