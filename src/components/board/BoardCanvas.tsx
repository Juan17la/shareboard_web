/**
 * The board itself: an infinite white canvas, the dot grid, everything drawn on
 * it, and the pointer handling that draws and moves it.
 *
 * The mobile split is one finger = the active tool, two fingers = the camera. A
 * browser has more pointers to spend, so the same rule becomes:
 *
 *   primary button / one finger / pen  ->  the active tool
 *   two fingers, middle button, space  ->  pan
 *   wheel                              ->  pan       (trackpad two-finger)
 *   ctrl / ⌘ + wheel                   ->  zoom at the pointer
 *
 * Panning never shares a button with drawing, which is what keeps a stroke from
 * turning into a drag halfway through. The camera lives in the store but never
 * on the wire: pan and zoom are per-device (mobile/docs/05-model-date).
 *
 * Rendering is one `<canvas>` repainted on a frame loop rather than a DOM tree
 * of SVG nodes: an infinite board accumulates thousands of elements, and a
 * board that stutters while someone is drawing on it fails the design's first
 * principle before any of the rest matters.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSessionStore } from '../../features/session';
import { screenToBoard, useBoardStore, type Camera } from '../../features/board-store';
import type { Point } from '../../lib/contract';
import { LIMITS } from '../../lib/contract';
import { simplify } from '../../lib/geometry';
import { MAX_ZOOM, MIN_ZOOM, fillFor } from '../../lib/theme';
import { visibleSorted } from '../../lib/ops';

import { PeerCursors } from './PeerCursors';
import { TextEditorOverlay } from './TextEditorOverlay';
import { cursorFor } from './cursors';
import { paintBoard } from './renderer';

const clampZoom = (scale: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));

/** Zoom about a fixed screen point, so what is under the pointer stays put. */
function zoomAround(camera: Camera, focal: Point, next: number): Camera {
  const bx = (focal.x - camera.x) / camera.scale;
  const by = (focal.y - camera.y) / camera.scale;
  return { scale: next, x: focal.x - bx * next, y: focal.y - by * next };
}

interface Pointers {
  /** Live pointer positions, in canvas-relative CSS pixels. */
  map: Map<number, Point>;
  /** The pointer currently drawing, if any. */
  drawingId: number | null;
  /** Centroid + spread of a two-finger gesture, from the previous event. */
  pinch: { center: Point; distance: number } | null;
  /** Where a middle-button or space drag started. */
  panFrom: Point | null;
}

export function BoardCanvas({ onCursorMove }: { onCursorMove?: (at: Point) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const camera = useBoardStore((s) => s.camera);
  const tool = useBoardStore((s) => s.tool);
  const config = useBoardStore((s) => s.config);
  const elements = useBoardStore((s) => s.elements);
  const canEdit = useBoardStore((s) => s.canEditNow());
  const grid = useSessionStore((s) => s.settings.grid);
  const smooth = useSessionStore((s) => s.settings.smooth);

  const [livePoints, setLivePoints] = useState<number[]>([]);
  const [liveShape, setLiveShape] = useState<{ from: Point; to: Point } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const spaceHeld = useRef(false);

  const pointers = useRef<Pointers>({
    map: new Map(),
    drawingId: null,
    pinch: null,
    panFrom: null,
  });

  // The in-progress stroke and shape live in state (the painter reads them) and
  // in a ref (the handlers read them). The ref is what lets the commit on
  // pointer-up read the finished draft without going through a state updater:
  // an updater that commits would run twice in development — React re-invokes
  // them to check they are pure — and send the stroke to everyone twice.
  const livePointsRef = useRef<number[]>([]);
  const liveShapeRef = useRef<{ from: Point; to: Point } | null>(null);

  const setPoints = (points: number[]) => {
    livePointsRef.current = points;
    setLivePoints(points);
  };
  const setShape = (shape: { from: Point; to: Point } | null) => {
    liveShapeRef.current = shape;
    setLiveShape(shape);
  };

  const list = useMemo(() => visibleSorted(elements), [elements]);

  // --- painting ------------------------------------------------------------
  // One `requestAnimationFrame` per change rather than a paint per event: a
  // pointer can fire several times between frames, and the extra paints would
  // all be thrown away by the next one.

  const frame = useRef<number | null>(null);
  // An image element decodes asynchronously, so finishing a decode has to ask
  // for another frame. Going through a ref keeps that from being a callback
  // that captures itself while it is still being created.
  const repaint = useRef<() => void>(() => {});
  const paint = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Match the backing store to the device pixels, then work in CSS pixels.
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { camera: cam, tool: activeTool } = useBoardStore.getState();
      const cfg = config;
      const drafts = [...list];

      // The in-progress stroke and shape are drawn as ordinary elements on top
      // of everything else, so what is being drawn looks exactly like what it
      // will become the moment the pointer lifts.
      if (livePoints.length >= 4) {
        drafts.push({
          id: 'live-stroke',
          kind: 'stroke',
          points: livePoints,
          color: cfg.color,
          width: cfg.width,
          createdBy: 'local',
          createdAt: 0,
          updatedAt: 0,
          z: Number.MAX_SAFE_INTEGER,
        });
      }
      if (liveShape && activeTool === 'shape') {
        drafts.push({
          id: 'live-shape',
          kind: 'shape',
          shape: cfg.shape,
          from: liveShape.from,
          to: liveShape.to,
          stroke: cfg.color,
          strokeWidth: cfg.width,
          fill: cfg.filled ? fillFor(cfg.color) : null,
          createdBy: 'local',
          createdAt: 0,
          updatedAt: 0,
          z: Number.MAX_SAFE_INTEGER,
        });
      }

      paintBoard(ctx, {
        elements: drafts,
        camera: cam,
        width,
        height,
        smooth,
        grid,
        background: '#FFFFFF',
        onImageReady: () => repaint.current(),
      });
    });
    // `config` is in the list because changing the colour or width while a
    // shape is being dragged has to repaint the draft, and no pointer event
    // follows to trigger it.
  }, [list, livePoints, liveShape, smooth, grid, config]);

  useEffect(() => {
    repaint.current = paint;
    paint();
  }, [paint, camera]);

  // Repaint on resize and on a monitor change that alters the pixel ratio.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(() => paint());
    observer.observe(host);
    window.addEventListener('resize', paint);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', paint);
    };
  }, [paint]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      // Clearing the handle matters as much as cancelling it: `paint` treats a
      // non-null `frame` as "a repaint is already queued" and returns early, so
      // leaving a cancelled id behind wedges the canvas permanently blank. In
      // development StrictMode runs this cleanup once right after mount, which
      // is exactly when that would happen.
      frame.current = null;
    },
    [],
  );

  // Space is the universal "pan instead" modifier, so it is tracked globally
  // rather than on the canvas — a click on the tool rail must not lose it.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      spaceHeld.current = true;
      // Space would otherwise scroll the page under some browsers.
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // --- geometry helpers ----------------------------------------------------

  const localPoint = (e: PointerEvent | React.PointerEvent): Point => {
    const box = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  const centroid = (points: Point[]): Point => ({
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  });

  const spread = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

  /** Abandons an in-progress stroke or shape without committing it. */
  const cancelDraft = () => {
    pointers.current.drawingId = null;
    setPoints([]);
    setShape(null);
  };

  // --- pointer handling ----------------------------------------------------

  const onPointerDown = (e: React.PointerEvent) => {
    const state = pointers.current;
    const at = localPoint(e);
    state.map.set(e.pointerId, at);
    (e.target as Element).setPointerCapture(e.pointerId);

    // A second touch means the gesture was always a camera move: throw away
    // whatever the first finger had started. This is also the palm rejection —
    // mobile does it with `maxPointers(1)`.
    if (state.map.size >= 2) {
      cancelDraft();
      const [a, b] = [...state.map.values()];
      state.pinch = { center: centroid([a, b]), distance: spread(a, b) };
      setPanning(true);
      return;
    }

    // Middle button, or the space modifier: pan.
    if (e.button === 1 || spaceHeld.current) {
      state.panFrom = at;
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;

    const store = useBoardStore.getState();
    // Offline, nothing starts: a stroke that could not be sent would only ever
    // exist on this screen, and the banner is what says so.
    if (!store.canEditNow() || store.connection !== 'online') return;

    const p = screenToBoard(at.x, at.y);
    state.drawingId = e.pointerId;
    // Drawing is what the options were for; fold them away to give the board
    // back its width the moment the gesture starts.
    store.setRailOpen(false);

    switch (store.tool) {
      case 'eraser':
        store.eraseAt(p, 12 / store.camera.scale);
        break;
      case 'pen':
        setPoints([p.x, p.y]);
        break;
      case 'shape':
        setShape({ from: p, to: p });
        break;
      case 'text': {
        const id = store.addText(p);
        state.drawingId = null;
        if (id) setEditingId(id);
        break;
      }
      case 'fill':
        store.fillAt(p);
        state.drawingId = null;
        break;
    }
    onCursorMove?.(p);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = pointers.current;
    const at = localPoint(e);
    if (state.map.has(e.pointerId)) state.map.set(e.pointerId, at);

    // Two fingers: pan by the centroid's delta and zoom by the spread's ratio,
    // both from the previous event rather than from where the gesture started.
    // That keeps them stateless and lets the two compose correctly.
    if (state.map.size >= 2 && state.pinch) {
      const [a, b] = [...state.map.values()];
      const center = centroid([a, b]);
      const distance = spread(a, b);
      const store = useBoardStore.getState();
      let next: Camera = {
        ...store.camera,
        x: store.camera.x + (center.x - state.pinch.center.x),
        y: store.camera.y + (center.y - state.pinch.center.y),
      };
      if (state.pinch.distance > 0 && distance > 0) {
        next = zoomAround(next, center, clampZoom(next.scale * (distance / state.pinch.distance)));
      }
      store.setCamera(next);
      state.pinch = { center, distance };
      return;
    }

    if (state.panFrom) {
      const store = useBoardStore.getState();
      store.setCamera({
        ...store.camera,
        x: store.camera.x + (at.x - state.panFrom.x),
        y: store.camera.y + (at.y - state.panFrom.y),
      });
      state.panFrom = at;
      return;
    }

    const p = screenToBoard(at.x, at.y);
    // Presence follows the pointer whether or not anything is being drawn: it
    // is how the others see you thinking, not just marking.
    onCursorMove?.(p);

    if (state.drawingId !== e.pointerId) return;
    const store = useBoardStore.getState();

    switch (store.tool) {
      case 'eraser':
        store.eraseAt(p, 12 / store.camera.scale);
        break;
      case 'pen': {
        // The stroke is sent as one `add` when the gesture ends, not per point.
        const prev = livePointsRef.current;
        if (prev.length / 2 < LIMITS.maxStrokePoints) setPoints([...prev, p.x, p.y]);
        break;
      }
      case 'shape': {
        const prev = liveShapeRef.current;
        if (prev) setShape({ from: prev.from, to: p });
        break;
      }
    }
  };

  const finishPointer = (e: React.PointerEvent) => {
    const state = pointers.current;
    state.map.delete(e.pointerId);
    if (state.map.size < 2) state.pinch = null;
    if (state.map.size === 0) {
      state.panFrom = null;
      setPanning(false);
    }

    if (state.drawingId !== e.pointerId) return;
    state.drawingId = null;
    const store = useBoardStore.getState();

    if (store.tool === 'pen') {
      const points = livePointsRef.current;
      setPoints([]);
      if (points.length >= 4) store.addStroke(simplify(points));
    }
    if (store.tool === 'shape') {
      const shape = liveShapeRef.current;
      setShape(null);
      if (shape) {
        // A click with the shape tool is a mis-hit, not a zero-size rectangle.
        const dragged = Math.hypot(shape.to.x - shape.from.x, shape.to.y - shape.from.y);
        if (dragged * store.camera.scale > 6) {
          store.addShape(store.config.shape, shape.from, shape.to);
        }
      }
    }
  };

  // Wheel: pan by default, zoom with the ctrl/⌘ modifier — which is also what a
  // trackpad pinch reports, so pinch-to-zoom works without a special case.
  // Registered by hand because React's synthetic wheel handler is passive and
  // cannot call `preventDefault` to stop the page bouncing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const store = useBoardStore.getState();
      const box = canvas.getBoundingClientRect();
      const focal = { x: e.clientX - box.left, y: e.clientY - box.top };

      if (e.ctrlKey || e.metaKey) {
        // A trackpad pinch sends small deltas; a mouse wheel sends large ones.
        // The exponential keeps both feeling proportional.
        const next = clampZoom(store.camera.scale * Math.exp(-e.deltaY / 240));
        store.setCamera(zoomAround(store.camera, focal, next));
        return;
      }
      // Line-mode wheels report deltas of ~1; page-mode of ~1 screen.
      const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? box.height : 1;
      store.setCamera({
        ...store.camera,
        x: store.camera.x - e.deltaX * unit,
        y: store.camera.y - e.deltaY * unit,
      });
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const editing = editingId ? elements[editingId] : null;

  return (
    <div ref={hostRef} className="absolute inset-0 bg-background">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none select-none"
        style={{ cursor: cursorFor(tool, canEdit, panning) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onPointerLeave={finishPointer}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        aria-label="Shareboard canvas"
      />

      <PeerCursors camera={camera} />

      {editing && editing.kind === 'text' ? (
        <TextEditorOverlay
          element={editing}
          camera={camera}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </div>
  );
}
