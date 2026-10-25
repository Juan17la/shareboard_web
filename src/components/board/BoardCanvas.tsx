/**
 * The board itself: an infinite white canvas, the dot grid, everything drawn on
 * it, and the pointer handling that draws and moves it.
 *
 * The mobile split is one finger = the active tool, two fingers = the camera. A
 * browser has more pointers to spend, so the same rule becomes:
 *
 *   primary button / one finger / pen  ->  the active tool
 *   two fingers, middle button, shift  ->  pan   (space and alt as well)
 *   hand tool, or no edit rights       ->  primary button pans too
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
import {
  boardToScreen,
  editPatches,
  HIGHLIGHTER_SCALE,
  setLiveDrag,
  heldByOthers,
  previewOf,
  screenToBoard,
  shapeElement,
  useBoardStore,
  writable,
  type Camera,
  type LiveEdit,
} from '../../features/board-store';
import type { BoardElement, Link, Point, Preview, ShapeElement } from '../../lib/contract';
import { LIMITS, SHAPE_TEXT_SIZE } from '../../lib/contract';
import {
  boxOf,
  elbowDragPatch,
  bendHandleOf,
  curveFromDrag,
  curveHandlesOf,
  clampZoom,
  coveringFigure,
  elementsIn,
  fitSticky,
  groupHandles,
  handlesOf,
  isLineLike,
  labelBox,
  labelFromDrag,
  labelButtonOf,
  labelLines,
  lineLabelCentre,
  linkEndpoints,
  recognizeSketch,
  sketchResize,
  resizeElement,
  resizeGroup,
  rotateHandleOf,
  rotationFromDrag,
  rotationOf,
  ROTATE_HANDLE,
  shapeAt,
  shapeBounds,
  simplify,
  zoomAround,
  type Sketch,
} from '../../lib/geometry';
import { Colors, Css } from '../../lib/theme';
import { visibleSorted } from '../../lib/ops';
import { useT } from '../../features/i18n';
import { keys } from '../../hooks/use-shortcuts';

import { ContextMenu, type MenuSpot } from './ContextMenu';
import { LaserLayer } from './LaserLayer';
import { pushLaser } from './laser';
import { PeerCursors } from './PeerCursors';
import { TextEditorOverlay } from './TextEditorOverlay';
import { cursorFor } from './cursors';
import { paintAnchors, paintBoard, paintDashedBox, paintHeld, paintSelection } from './renderer';

/**
 * Matches a canvas's backing store to its CSS size in device pixels and returns
 * its context set to draw in CSS pixels, with that size.
 */
function fitCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { width, height } = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

/** How long a pen stroke's end is held before it is read as a figure (`recognizeSketch`). */
const SKETCH_MS = 500;
/** Screen pixels the pointer may wander and still count as held still. */
const STILL_PX = 8;

type Ends = { from: Point; to: Point; fromLink?: Link | null; toLink?: Link | null };
type Box = { from: Point; to: Point };

interface Pointers {
  /** Live pointer positions, in canvas-relative CSS pixels. */
  map: Map<number, Point>;
  /** The pointer currently drawing, if any. */
  drawingId: number | null;
  /** Centroid + spread of a two-finger gesture, from the previous event. */
  pinch: { center: Point; distance: number } | null;
  /** Where a middle-button or space drag started. */
  panFrom: Point | null;
  /** Where a pan started: a pan that never moved was a click, and a click deselects. */
  panClick: Point | null;
}

export function BoardCanvas({
  onCursorMove,
  onPreview,
}: {
  /** `laser`: the pointer is the laser, and the others draw its trail. */
  onCursorMove?: (at: Point, laser?: boolean) => void;
  /** What is being drawn or dragged, for the others; `null` once the gesture is over. */
  onPreview?: (preview: Preview | null) => void;
}) {
  /** The live layer, on top: it takes the pointer. */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** The board layer, under it. */
  const baseRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const camera = useBoardStore((s) => s.camera);
  const tool = useBoardStore((s) => s.tool);
  const config = useBoardStore((s) => s.config);
  const elements = useBoardStore((s) => s.elements);
  const liveErased = useBoardStore((s) => s.liveErased);
  const canEdit = useBoardStore((s) => s.canEditNow());
  const selectedIds = useBoardStore((s) => s.selectedIds);
  const t = useT();
  const grid = useSessionStore((s) => s.settings.grid);
  const smooth = useSessionStore((s) => s.settings.smooth);
  const dark = useSessionStore((s) => s.theme === 'dark');

  const [liveShape, setLiveShape] = useState<Box | null>(null);
  // The selection while a handle or a body is being dragged; the elements only
  // change (one op each) when the pointer lifts.
  const [liveEdit, setLiveEdit] = useState<LiveEdit | null>(null);
  /** The cursor tool's rubber band, in board coordinates. */
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** What is being typed: painted in place by the renderer, so the editor only holds the caret. */
  const [draft, setDraft] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [menu, setMenu] = useState<MenuSpot | null>(null);

  const pointers = useRef<Pointers>({
    map: new Map(),
    drawingId: null,
    pinch: null,
    panFrom: null,
    panClick: null,
  });

  // The in-progress stroke and shape live in state (the painter reads them) and
  // in a ref (the handlers read them). The ref is what lets the commit on
  // pointer-up read the finished draft without going through a state updater:
  // an updater that commits would run twice in development — React re-invokes
  // them to check they are pure — and send the stroke to everyone twice.
  const livePointsRef = useRef<number[]>([]);
  const liveShapeRef = useRef<Box | null>(null);
  /** Where the pen was last held still, and the wait for it to become a figure. */
  const still = useRef<{ at: Point; timer: ReturnType<typeof setTimeout> | null }>({
    at: { x: 0, y: 0 },
    timer: null,
  });
  const editRef = useRef<LiveEdit | null>(null);
  /** Where a handle sits from the pointer that took hold of it (`beginEdit`). */
  const grab = useRef({ x: 0, y: 0 });
  const marqueeRef = useRef<Box | null>(null);
  /** Where a line was started, unsnapped: its anchor can change as the end moves. */
  const lineStart = useRef<Point>({ x: 0, y: 0 });
  /** Where the pointer is over the board: the connection points nearest it show. */
  const pointerAt = useRef<Point | null>(null);

  // The stroke being drawn changes on every move: it lives in the ref alone and
  // repaints the live layer, never this component.
  const setPoints = (points: number[]) => {
    livePointsRef.current = points;
    paintLiveLayer();
  };
  const setShape = (shape: Box | null) => {
    liveShapeRef.current = shape;
    setLiveShape(shape);
  };

  // A pen stroke held still at its end for 500 ms (`SKETCH_MS`) is made into the figure it
  // was meant to be (`recognizeSketch`) — at once, on the board, not as a
  // preview: the stroke gives way to it, and the pointer, still down, then
  // resizes it (an outward pull grows it, a line's tip follows), so moving on
  // never loses the figure.
  const figureRef = useRef<{
    id: string;
    sketch: Sketch;
    p0: Point;
    patch: { from: Point; to: Point } | null;
  } | null>(null);
  /** Where the pen last was, in board space. */
  const penLast = useRef<Point>({ x: 0, y: 0 });
  const stopSketch = () => {
    if (still.current.timer) clearTimeout(still.current.timer);
    still.current.timer = null;
  };
  const awaitSketch = (at: Point) => {
    stopSketch();
    still.current.at = at;
    still.current.timer = setTimeout(() => {
      still.current.timer = null;
      const scale = useBoardStore.getState().camera.scale;
      const sketch = recognizeSketch(livePointsRef.current, 24 / scale);
      const id = sketch ? useBoardStore.getState().addSketch(sketch) : null;
      if (sketch && id) {
        figureRef.current = { id, sketch, p0: penLast.current, patch: null };
        setPoints([]);
      }
    }, SKETCH_MS);
  };
  useEffect(() => stopSketch, []);

  // The context menu key (or Shift+F10) opens the same menu from the keyboard,
  // at the middle of the board, so Copy / Paste / Order are not right-click only.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [role="dialog"], [role="menu"]')) return;
      const store = useBoardStore.getState();
      const box = canvasRef.current?.getBoundingClientRect();
      if (!box || !store.canEditNow()) return;
      e.preventDefault();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      setMenu({ x, y, at: screenToBoard(box.width / 2, box.height / 2) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const setEdit = (edit: LiveEdit | null) => {
    editRef.current = edit;
    setLiveDrag(edit);
    keys.dragging = edit !== null;
    setLiveEdit(edit);
  };
  const setBand = (box: Box | null) => {
    marqueeRef.current = box;
    setMarquee(box);
  };

  // Sorted once per change to the elements, not once per pointer move: the
  // drag preview below only patches the sorted list.
  const sorted = useMemo(() => visibleSorted(elements), [elements]);
  // What the pointer is changing right now — a drag (the same patches the lift
  // will commit, so the preview is the result), or the words being typed — by
  // id, in paint order. These leave the board layer and are drawn on the live
  // one, so a drag repaints a handful of elements, not the board.
  const lifted = useMemo(() => {
    const out = new Map<string, BoardElement>();
    if (editingId && draft !== null && elements[editingId]) {
      // A sticky note's words shrink to fit as they are typed.
      out.set(editingId, fitSticky({ ...elements[editingId], text: draft } as BoardElement));
    }
    if (liveEdit) {
      for (const p of editPatches(sorted, liveEdit)) out.set(p.id, { ...elements[p.id], ...p.patch } as BoardElement);
    }
    return out;
  }, [sorted, elements, liveEdit, editingId, draft]);
  // Everything as the user sees it: what the selection frame, the anchors and the tags are drawn round.
  const list = useMemo(
    () => (lifted.size ? sorted.map((el) => lifted.get(el.id) ?? el) : sorted),
    [sorted, lifted],
  );

  // What the others are drawing or dragging (`peerDrafts`) is drawn on the live
  // layer too; what they drag leaves the board layer while they do. Only the
  // set of ids is state here: a preview's every move repaints the live layer, not this component.
  const [theirsKey, setTheirsKey] = useState('');
  // The board layer's elements: the same ids for a whole drag, so it is not repainted while it lasts.
  const liftedKey = [...lifted.keys()].join(',');
  const board = useMemo(() => {
    const away = new Set([...(liftedKey ? liftedKey.split(',') : []), ...(theirsKey ? theirsKey.split(',') : [])]);
    return away.size ? sorted.filter((el) => !away.has(el.id)) : sorted;
  }, [sorted, liftedKey, theirsKey]);

  // What the others hold: dimmed, framed in their colour, not for picking.
  const participants = useBoardStore((s) => s.participants);
  const you = useBoardStore((s) => s.you);
  const held = useMemo(() => heldByOthers(participants, you), [participants, you]);

  const selecting = tool === 'select' || tool === 'shape';
  const selected = useMemo(
    () => (selecting ? list.filter((e) => selectedIds.includes(e.id)) : []),
    [list, selectedIds, selecting],
  );
  const selectedShape = selected.length === 1 && selected[0].kind === 'shape' ? selected[0] : null;
  // Connection points show whenever an arrow could land on them.
  const showAnchors =
    (tool === 'shape' && config.shape === 'arrow') || selectedShape?.shape === 'arrow';
  // What the arrow being drawn, or the end being dragged, binds to: framed, so
  // where it will hold on is no surprise.
  const linked = useMemo(() => {
    const ends = (liveShape ?? (liveEdit?.mode === 'resize' ? liveEdit.patch : null)) as Partial<Ends> | null;
    const ids = [ends?.fromLink?.id, ends?.toLink?.id];
    return list.filter((el) => ids.includes(el.id));
  }, [list, liveShape, liveEdit]);

  // --- painting ------------------------------------------------------------
  // Two canvases. The board layer holds what is on the board, and is repainted
  // only when that, the camera or the theme changes. The live layer above it
  // holds what the pointer is doing — the stroke or figure being drawn, what is
  // dragged or typed, the others' drafts, the selection, the rubber band, the
  // anchors — and is repainted on every move. Each asks for at most one
  // `requestAnimationFrame` per change: a pointer can fire several times
  // between frames, and the extra paints would be thrown away by the next one.

  const boardFrame = useRef<number | null>(null);
  const liveFrame = useRef<number | null>(null);
  // What each layer draws, as of the latest render. A frame draws whatever is
  // current when it fires — not what was current when it was asked for — so a
  // change that lands while a frame is already queued is never lost.
  const drawBoardRef = useRef<() => void>(() => {});
  const drawLiveRef = useRef<() => void>(() => {});
  const paintBoardLayer = useCallback(() => {
    if (boardFrame.current !== null) return;
    boardFrame.current = requestAnimationFrame(() => {
      boardFrame.current = null;
      drawBoardRef.current();
    });
  }, []);
  const paintLiveLayer = useCallback(() => {
    if (liveFrame.current !== null) return;
    liveFrame.current = requestAnimationFrame(() => {
      liveFrame.current = null;
      drawLiveRef.current();
    });
  }, []);
  // A decoding image, a font, a resize or a peer's preview ask for both.
  const repaintAll = useCallback(() => {
    paintBoardLayer();
    paintLiveLayer();
  }, [paintBoardLayer, paintLiveLayer]);

  const drawBoard = useCallback(() => {
    const surface = baseRef.current && fitCanvas(baseRef.current);
    if (!surface) return;
    paintBoard(surface.ctx, {
      elements: board,
      camera: useBoardStore.getState().camera,
      width: surface.width,
      height: surface.height,
      smooth,
      grid,
      background: Colors.background,
      dark,
      held,
      erasing: liveErased,
      onImageReady: repaintAll,
    });
  }, [board, smooth, grid, dark, held, liveErased, repaintAll]);

  const drawLive = useCallback(() => {
    const surface = canvasRef.current && fitCanvas(canvasRef.current);
    if (!surface) return;
    const { camera: cam, peerDrafts } = useBoardStore.getState();
    const cfg = config;
    const drafts = [...lifted.values(), ...peerDrafts];
    // The in-progress stroke and shape are drawn as ordinary elements on top
    // of everything else, so what is being drawn looks exactly like what it
    // will become the moment the pointer lifts.
    const livePoints = livePointsRef.current;
    if (livePoints.length >= 4) {
      drafts.push({
        id: 'live-stroke',
        kind: 'stroke',
        points: livePoints,
        color: cfg.color,
        ...(cfg.pen === 'highlighter'
          ? { width: Math.min(LIMITS.maxStrokeWidth, cfg.width * HIGHLIGHTER_SCALE), tool: 'highlighter' as const }
          : { width: cfg.width }),
        createdBy: 'local',
        createdAt: 0,
        updatedAt: 0,
        z: Number.MAX_SAFE_INTEGER,
      });
    }
    if (liveShape && tool === 'shape') {
      drafts.push(
        shapeElement(cfg.shape, liveShape, cfg, {
          id: 'live-shape',
          createdBy: 'local',
          createdAt: 0,
          updatedAt: 0,
          z: Number.MAX_SAFE_INTEGER,
        }),
      );
    }
    const { ctx, width, height } = surface;
    paintBoard(ctx, {
      elements: drafts,
      camera: cam,
      width,
      height,
      smooth,
      grid: false,
      background: null,
      dark,
      held,
      erasing: liveErased,
      onImageReady: repaintAll,
    });
    if (held.size) paintHeld(ctx, [...list, ...peerDrafts], held, cam);
    if (selected.length) paintSelection(ctx, selected, cam);
    if (marquee) paintDashedBox(ctx, shapeBounds(marquee), cam);
    if (showAnchors && pointerAt.current) paintAnchors(ctx, list, cam, pointerAt.current);
    for (const el of linked) paintDashedBox(ctx, boxOf(el), cam, rotationOf(el));
    // `config` is in the list because changing the colour or width while a
    // shape is being dragged has to repaint the draft, and no pointer event
    // follows to trigger it.
  }, [lifted, list, liveShape, marquee, selected, showAnchors, linked, smooth, config, tool, dark, held, liveErased, repaintAll]);

  useEffect(() => {
    drawBoardRef.current = drawBoard;
    paintBoardLayer();
  }, [drawBoard, paintBoardLayer, camera]);
  useEffect(() => {
    drawLiveRef.current = drawLive;
    paintLiveLayer();
  }, [drawLive, paintLiveLayer, camera]);
  // `paint` is what a pointer move asks for (the anchors under it): the live layer.
  const paint = paintLiveLayer;

  // A peer's preview repaints the live layer, never this component — unless
  // the set of elements they drag changes, which the board layer has to know.
  useEffect(
    () =>
      useBoardStore.subscribe((s, prev) => {
        if (s.peerDrafts === prev.peerDrafts) return;
        const key = s.peerDrafts.map((el) => el.id).join(',');
        setTheirsKey((k) => (k === key ? k : key));
        paintLiveLayer();
      }),
    [paintLiveLayer],
  );

  // A board typeface that finishes loading repaints the text drawn in its fallback.
  useEffect(() => {
    document.fonts?.addEventListener('loadingdone', repaintAll);
    return () => document.fonts?.removeEventListener('loadingdone', repaintAll);
  }, [repaintAll]);

  // Repaint on resize and on a monitor change that alters the pixel ratio.
  // Registered once: the paints are reached through their refs.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const { width, height } = host.getBoundingClientRect();
      useBoardStore.getState().setViewport({ width, height });
      repaintAll();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    measure();
    window.addEventListener('resize', repaintAll);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', repaintAll);
    };
  }, [repaintAll]);

  useEffect(
    () => () => {
      for (const frame of [boardFrame, liveFrame]) {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        // Clearing the handle matters as much as cancelling it: a paint treats
        // a non-null handle as "a repaint is already queued" and returns early,
        // so leaving a cancelled id behind wedges the canvas permanently blank.
        // In development StrictMode runs this cleanup once right after mount,
        // which is exactly when that would happen.
        frame.current = null;
      }
    },
    [],
  );

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
    figureRef.current = null;
    useBoardStore.getState().discardErase();
    setEdit(null);
    setBand(null);
    setPoints([]);
    setShape(null);
    stopSketch();
    onPreview?.(null);
  };

  /** An arrow's ends bind to the shapes they land on; a plain line never does. */
  const snapLine = (shape: string, from: Point, to: Point): Ends => {
    if (shape !== 'arrow') return { from, to };
    const store = useBoardStore.getState();
    // Never to itself: the line being reshaped is not a target.
    const others = store.visibleElements().filter((el) => !store.selectedIds.includes(el.id));
    return linkEndpoints(others, from, to, 14 / store.camera.scale);
  };

  /**
   * The handle index for a curved or elbow line's fold — past the two
   * endpoints (0, 1) `handlesOf` gives a line, so it never collides with them.
   */
  const BEND_HANDLE = 2;
  /** The label of a line, dragged along it. */
  const LABEL_HANDLE = 6;
  /** The pull of a curved line at its start and at its end. */
  const CURVE_START_HANDLE = 7;
  const CURVE_END_HANDLE = 8;

  /** The patch of an edit dragged to `p`. A line's ends are re-bound after. */
  const dragPatch = (edit: LiveEdit, el: BoardElement, p: Point): Partial<BoardElement> => {
    if (edit.handle === LABEL_HANDLE && el.kind === 'shape') return { labelAt: labelFromDrag(el, p) };
    if (edit.handle === CURVE_START_HANDLE && el.kind === 'shape') return curveFromDrag(el, 'start', p);
    if (edit.handle === CURVE_END_HANDLE && el.kind === 'shape') return curveFromDrag(el, 'end', p);
    if (edit.handle === BEND_HANDLE && el.kind === 'shape' && isLineLike(el)) {
      // A curve's middle slides its whole bow; an elbow's, its middle segment.
      return el.route === 'curved' ? curveFromDrag(el, 'mid', p) : elbowDragPatch(el, p);
    }
    if (edit.handle === ROTATE_HANDLE) return { rotation: rotationFromDrag(el, p) };
    const next = resizeElement(el, edit.handle, p) as Partial<ShapeElement>;
    if (el.kind === 'shape' && isLineLike(el) && next.from && next.to) {
      return snapLine(el.shape, next.from, next.to);
    }
    return next;
  };

  /**
   * A pointer landing on the selection starts a drag of it rather than a new
   * shape: a handle (one element only) reshapes, anything selected moves the lot.
   */
  const beginEdit = (p: Point, scale: number): boolean => {
    const store = useBoardStore.getState();
    const sel = store.selectedElements();
    if (!sel.length) return false;
    const hitR = 12 / scale;
    const one = sel.length === 1 ? sel[0] : null;
    const curve = one?.kind === 'shape' ? curveHandlesOf(one) : null;
    const fold = curve ? curve.mid : one?.kind === 'shape' ? bendHandleOf(one) : null;
    const onFold = fold ? Math.hypot(fold.x - p.x, fold.y - p.y) <= hitR : false;
    const near = (q: Point | undefined) => (q ? Math.hypot(q.x - p.x, q.y - p.y) <= hitR : false);
    const knob = one ? rotateHandleOf(one, scale) : null;
    const onKnob = knob ? Math.hypot(knob.x - p.x, knob.y - p.y) <= hitR : false;
    // A line's label is dragged along the line; an end, before it, is still an end.
    // Several selected: the corners of their overall box resize them together.
    const corners = one ? handlesOf(one) : groupHandles(sel);
    const end = corners.findIndex((h) => Math.hypot(h.x - p.x, h.y - p.y) <= hitR);
    const label = one?.kind === 'shape' && isLineLike(one) && one.text ? one : null;
    const size = label?.fontSize ?? SHAPE_TEXT_SIZE;
    const box = label ? labelBox(label, labelLines(label, size), size) : null;
    const pad = 6 / scale;
    const onLabel = box
      ? p.x >= box.x - pad && p.x <= box.x + box.width + pad && p.y >= box.y - pad && p.y <= box.y + box.height + pad
      : false;
    const handle = onKnob
      ? ROTATE_HANDLE
      : end >= 0
        ? end
        : near(curve?.start)
          ? CURVE_START_HANDLE
          : near(curve?.end)
            ? CURVE_END_HANDLE
            : onLabel
              ? LABEL_HANDLE
              : onFold
                ? BEND_HANDLE
                : -1;
    // The pointer holds a handle where it landed on it: the handle keeps that
    // distance from the pointer instead of jumping under it.
    const held = onKnob
      ? knob
      : handle === LABEL_HANDLE && label
        ? lineLabelCentre(label)
        : handle === CURVE_START_HANDLE
          ? (curve?.start ?? null)
          : handle === CURVE_END_HANDLE
            ? (curve?.end ?? null)
            : handle === BEND_HANDLE
              ? fold
              : handle >= 0
                ? corners[handle]
                : null;
    grab.current = held ? { x: held.x - p.x, y: held.y - p.y } : { x: 0, y: 0 };
    // The selection's handles are drawn over everything, so they are its own
    // wherever they are, even with a figure on top. Elsewhere, something drawn
    // above the selection owns the press: after "send to back" the selection
    // sits hidden under other figures, and a press on one of them must pick it,
    // not move everything behind it.
    if (handle < 0 && coveringFigure(store.visibleElements(), sel, p, 6 / scale)) return false;
    const onBody = !!store.elementAt(p, 6 / scale, sel);
    const mode = handle >= 0 ? 'resize' : onBody ? 'move' : null;
    if (!mode) return false;
    setEdit({ ids: sel.map((el) => el.id), mode, handle, start: p, dx: 0, dy: 0, patch: null });
    return true;
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

    const store = useBoardStore.getState();
    // Middle button, Shift, Space, Alt or the right button: pan, whatever the
    // tool — Shift is the keyboard's two fingers. The hand tool pans too; so
    // does a plain drag for someone who cannot edit, which is the one gesture
    // the board still owes a viewer. The cursor itself never pans: a drag with
    // it selects or moves.
    const p = screenToBoard(at.x, at.y);
    if (
      e.button === 1 ||
      e.button === 2 ||
      e.shiftKey ||
      e.altKey ||
      keys.spaceHeld ||
      store.tool === 'hand' ||
      !store.canEditNow()
    ) {
      state.panFrom = at;
      state.panClick = at;
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;
    // Not before the board is open; offline is fine (the outbox waits for the reconnect).
    if (!writable(store.connection)) return;

    state.drawingId = e.pointerId;
    // Drawing is what the options were for; fold them away to give the board
    // back its width the moment the gesture starts.
    store.setRailOpen(false);

    switch (store.tool) {
      case 'eraser':
        store.eraseAt(p, 12 / store.camera.scale);
        break;
      case 'pen':
        if (store.config.pen === 'laser') {
          pushLaser('self', p);
          onCursorMove?.(p, true);
          return;
        }
        penLast.current = p;
        setPoints([p.x, p.y]);
        // A highlighter stays a highlight: holding still never turns it into a figure.
        if (store.config.pen === 'pen') awaitSketch(at);
        break;
      case 'sticky': {
        state.drawingId = null;
        if (store.config.vote) {
          store.addVote(p);
          break;
        }
        // The sticky tool stays in hand: one note after another is how a brainstorm goes.
        const id = store.addSticky(p);
        if (id) setEditingId(id);
        break;
      }
      case 'shape': {
        if (beginEdit(p, store.camera.scale)) break;
        lineStart.current = p;
        setShape(snapLine(store.config.shape, p, p));
        break;
      }
      case 'select': {
        if (beginEdit(p, store.camera.scale)) break;
        // On something not yet selected: pick it up and carry it at once. Off
        // everything: rubber-band a new selection (a click picks nothing).
        const hit = store.elementAt(p, 6 / store.camera.scale);
        if (hit) {
          store.select(hit.id);
          beginEdit(p, store.camera.scale);
        } else {
          setBand({ from: p, to: p });
        }
        break;
      }
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
    // The laser, while pressed: a trail here, and on everyone else's screen.
    const laser = state.drawingId === e.pointerId && useBoardStore.getState().tool === 'pen' && useBoardStore.getState().config.pen === 'laser';
    if (laser) pushLaser('self', p);
    // Presence follows the pointer whether or not anything is being drawn: it
    // is how the others see you thinking, not just marking.
    onCursorMove?.(p, laser);
    if (laser) return;
    // Where Ctrl+V lands.
    keys.pointer = at;
    pointerAt.current = p;
    if (showAnchors) paint();

    if (state.drawingId !== e.pointerId) return;
    const store = useBoardStore.getState();

    switch (store.tool) {
      case 'eraser':
        store.eraseAt(p, 12 / store.camera.scale);
        break;
      case 'pen': {
        penLast.current = p;
        const figure = figureRef.current;
        if (figure) {
          // A figure has been made from the stroke: the pointer now sizes it.
          figure.patch = sketchResize(figure.sketch, figure.p0, p);
          setEdit({ ids: [figure.id], mode: 'resize', handle: -1, start: figure.p0, dx: 0, dy: 0, patch: figure.patch });
          break;
        }
        // The stroke is sent as one `add` when the gesture ends, not per point.
        const prev = livePointsRef.current;
        if (store.config.pen === 'pen' && Math.hypot(at.x - still.current.at.x, at.y - still.current.at.y) > STILL_PX) {
          awaitSketch(at);
        }
        if (prev.length / 2 < LIMITS.maxStrokePoints) setPoints([...prev, p.x, p.y]);
        break;
      }
      case 'shape':
      case 'select': {
        const edit = editRef.current;
        if (edit && edit.mode === 'move') {
          setEdit({ ...edit, dx: p.x - edit.start.x, dy: p.y - edit.start.y });
        } else if (edit) {
          const held = { x: p.x + grab.current.x, y: p.y + grab.current.y };
          if (edit.ids.length > 1) {
            setEdit({ ...edit, patches: resizeGroup(edit.ids.map((id) => store.elements[id]), edit.handle, held) });
          } else setEdit({ ...edit, patch: dragPatch(edit, store.elements[edit.ids[0]], held) });
        } else if (marqueeRef.current) {
          setBand({ from: marqueeRef.current.from, to: p });
        } else if (liveShapeRef.current) {
          setShape(snapLine(store.config.shape, lineStart.current, p));
        }
        break;
      }
    }
    onPreview?.(previewOf(store.config, editRef.current, livePointsRef.current, liveShapeRef.current));
  };

  const finishPointer = (e: React.PointerEvent) => {
    const state = pointers.current;
    state.map.delete(e.pointerId);
    if (state.map.size < 2) state.pinch = null;
    if (state.map.size === 0) {
      state.panFrom = null;
      setPanning(false);
      // A pan that did not move was a click on empty board: let the selection go.
      const from = state.panClick;
      state.panClick = null;
      const at = localPoint(e);
      if (from && Math.hypot(at.x - from.x, at.y - from.y) < 4) {
        const store = useBoardStore.getState();
        if (e.button === 2) {
          // A right click that never dragged is the menu, over what is under it.
          const p = screenToBoard(at.x, at.y);
          const hit = store.elementAt(p, 6 / store.camera.scale);
          if (hit && !store.selectedIds.includes(hit.id)) {
            if (store.tool !== 'select') store.setTool('select');
            store.select(hit.id);
          } else if (!hit) store.select(null);
          // Off everything that can be picked, a locked element under the pointer can be unlocked.
          const locked = hit
            ? null
            : store.elementAt(p, 6 / store.camera.scale, store.visibleElements().filter((el) => el.locked));
          if (store.canEditNow()) setMenu({ x: e.clientX, y: e.clientY, at: p, locked: locked?.id });
        } else if (store.tool === 'select' && store.selectedIds.length) {
          store.select(null);
          store.setRailOpen(false);
        }
      }
    }

    if (state.drawingId !== e.pointerId) return;
    state.drawingId = null;
    // Once whatever the gesture commits below is queued: the end of the preview follows its ops.
    queueMicrotask(() => onPreview?.(null));
    const store = useBoardStore.getState();

    if (store.tool === 'eraser') store.commitErase();
    if (store.tool === 'pen') {
      const points = livePointsRef.current;
      const figure = figureRef.current;
      figureRef.current = null;
      setPoints([]);
      stopSketch();
      if (figure) {
        // The figure is already on the board; settle its size into the same undo step.
        setEdit(null);
        if (figure.patch) store.finishFigure(figure.id, figure.patch);
      } else if (points.length >= 4) {
        // The pencil stays in hand: many strokes in a row is what it is for.
        store.addStroke(simplify(points));
      }
    }
    const edit = editRef.current;
    if (edit) {
      // One undo step for the whole drag.
      if (edit.dx || edit.dy || edit.patch || edit.patches) store.commitEdit(edit);
      setEdit(null);
      // A click on an element lands here too (a move of zero): either way the
      // gesture is over and something is selected, so its options come back.
      store.setRailOpen(true);
      return;
    }
    const band = marqueeRef.current;
    if (band) {
      setBand(null);
      const b = shapeBounds(band);
      if (b.width * store.camera.scale > 4 || b.height * store.camera.scale > 4) {
        store.select(elementsIn(store.visibleElements(), b).map((el) => el.id));
      } else {
        // A click with the cursor picks the element under it (or nothing).
        store.select(store.elementAt(band.from, 6 / store.camera.scale)?.id ?? null);
      }
      // Selecting something is asking to change it: the options come up.
      store.setRailOpen(useBoardStore.getState().selectedIds.length > 0);
      return;
    }
    if (store.tool === 'shape') {
      const shape = liveShapeRef.current;
      setShape(null);
      if (shape) {
        const dragged = Math.hypot(shape.to.x - shape.from.x, shape.to.y - shape.from.y);
        if (dragged * store.camera.scale > 6) {
          // A new shape comes up selected, handles ready, so it can be sized
          // right away.
          const id = store.addShape(store.config.shape, shape);
          if (id) store.finishCreate([id]);
        } else {
          // A click with the shape tool picks the shape under it (or nothing).
          store.select(shapeAt(store.visibleElements(), shape.from, 6 / store.camera.scale)?.id ?? null);
          store.setRailOpen(useBoardStore.getState().selectedIds.length > 0);
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

  // The label button floats just below the selected shape, clear of the rotate knob.
  const labelAt = useMemo(() => {
    if (!selectedShape) return null;
    const at = labelButtonOf(selectedShape, camera.scale);
    return boardToScreen(at.x, at.y, camera);
  }, [selectedShape, camera]);

  /** With the cursor, a double click on a text or a shape types into it; on empty board it starts a new text. */
  const onDoubleClick = (e: React.MouseEvent) => {
    const store = useBoardStore.getState();
    if (store.tool !== 'select' || !store.canEditNow()) return;
    const box = canvasRef.current!.getBoundingClientRect();
    const p = screenToBoard(e.clientX - box.left, e.clientY - box.top);
    const hit = store.elementAt(p, 6 / store.camera.scale);
    // Not what someone else holds: it is theirs to edit until they let go.
    if (!hit) {
      const id = store.addText(p);
      if (id) setEditingId(id);
    } else if ((hit.kind === 'text' || hit.kind === 'shape') && !held.has(hit.id)) setEditingId(hit.id);
  };

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-clip bg-background">
      <canvas ref={baseRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block h-full w-full" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full touch-none select-none"
        style={{ cursor: cursorFor(tool, canEdit, panning) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onPointerLeave={finishPointer}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        aria-label="Shareboard canvas"
      />

      <LaserLayer />
      <PeerCursors camera={camera} />

      {menu ? <ContextMenu spot={menu} onClose={() => setMenu(null)} /> : null}

      {labelAt && selectedShape && !editing ? (
        <button
          type="button"
          aria-label={t.addText}
          onClick={() => setEditingId(selectedShape.id)}
          className="absolute z-20 rounded-full border bg-surface px-2.5 py-1 text-[0.75rem] font-extrabold shadow-panel transition hover:bg-surface-selected"
          style={{
            left: labelAt.x,
            top: labelAt.y,
            transform: 'translateX(-50%)',
            borderColor: Css.accent,
            color: Css.accent,
          }}
        >
          Aa · {t.addText}
        </button>
      ) : null}

      {editing && (editing.kind === 'text' || editing.kind === 'shape') ? (
        <TextEditorOverlay
          element={editing}
          camera={camera}
          onDraft={setDraft}
          onClose={() => {
            // A new text that kept its words comes up selected, with the cursor.
            const { elements, finishCreate } = useBoardStore.getState();
            const done = elements[editing.id];
            if (done?.kind === 'text' && !done.deleted && done.text) finishCreate([done.id]);
            setEditingId(null);
            setDraft(null);
          }}
        />
      ) : null}
    </div>
  );
}
