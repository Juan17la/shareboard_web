/**
 * Everything on screen for one board: elements, the active tool, the camera,
 * presence, connection status, and the outbox the realtime layer drains.
 *
 * Ported from `mobile/src/features/board/store.ts`, and the important rule is
 * the same: **every real change goes through `commitLocal`**. It does three
 * things at once — records an inverse for undo, applies the ops locally, and
 * queues them for the network — which is what makes drawing feel instant while
 * still converging with everyone else: the stroke is on screen before the
 * server has heard about it, and `use-board-sync` flushes the outbox a frame or
 * two later.
 *
 * Ops arriving from the server go through `applyRemote` instead, which skips
 * both the outbox (they are already everyone's truth) and the undo history
 * (undo is local — you undo your own work, never a collaborator's).
 *
 * The camera is deliberately not part of the model: pan and zoom are per-device
 * and never synced (mobile/docs/05-model-date).
 */
import {
  LIMITS,
  canEdit,
  isFillable,
  type BoardElement,
  type BoardMeta,
  type ElementId,
  type Op,
  type Participant,
  type Point,
  type ShapeElement,
  type ShapeKind,
  type StrokeElement,
  type TextElement,
  type ToolType,
  type UserId,
} from '../lib/contract';
import { hitTest } from '../lib/geometry';
import { shortId } from '../lib/id';
import { applyOps, invertOps, visibleSorted, type ElementMap } from '../lib/ops';
import { create } from '../lib/store';
import { DrawingPalette, StrokeSizes, fillFor } from '../lib/theme';

export type ConnectionStatus = 'idle' | 'connecting' | 'online' | 'offline';

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface ToolConfig {
  color: string;
  width: number;
  /** Whether a newly drawn enclosed shape gets a translucent fill. */
  filled: boolean;
  shape: ShapeKind;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

interface HistoryEntry {
  undo: Op[];
  redo: Op[];
}

interface BoardState {
  // identity / meta
  boardId: string | null;
  meta: BoardMeta | null;
  you: Participant | null;
  participants: Participant[];
  connection: ConnectionStatus;
  serverSeq: number;
  /**
   * Short-lived credential from `POST /boards/:id/join`. Owner-only REST calls
   * (rename, permissions, snapshot, delete) send it as `Authorization: Bearer`,
   * so it has to outlive the join that produced it. Kept out of localStorage on
   * purpose: it expires, and a new one is issued on every join.
   */
  boardToken: string | null;

  // content
  elements: ElementMap;
  zCounter: number;

  // interaction
  tool: ToolType;
  config: ToolConfig;
  camera: Camera;

  // sync / history
  outbox: Op[];
  clientSeq: number;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  hydrate(args: {
    meta: BoardMeta;
    elements: BoardElement[];
    participants: Participant[];
    you: Participant;
    seq: number;
  }): void;
  reset(): void;
  setConnection(status: ConnectionStatus): void;
  setParticipants(list: Participant[]): void;
  setMeta(meta: BoardMeta, you?: Participant): void;
  setBoardToken(token: string | null): void;
  setRemoteCursor(userId: UserId, at: Point): void;

  setTool(tool: ToolType): void;
  setConfig(patch: Partial<ToolConfig>): void;
  setCamera(camera: Camera): void;

  addStroke(points: number[]): void;
  addShape(shape: ShapeKind, from: Point, to: Point): void;
  /** Paint bucket: tint the topmost enclosed shape under `at`. */
  fillAt(at: Point): boolean;
  addText(at: Point): ElementId | null;
  updateText(
    id: ElementId,
    patch: Partial<Pick<TextElement, 'text' | 'fontSize' | 'bold' | 'italic' | 'color'>>,
  ): void;
  addImage(at: Point, width: number, height: number, uri: string): void;
  eraseAt(at: Point, radius?: number): void;
  clearBoard(): void;

  undo(): void;
  redo(): void;
  /**
   * Ops from the server. `own` marks this client's echo: those were applied by
   * `commitLocal` already, so only the server-assigned paint order is taken.
   */
  applyRemote(ops: Op[], seq: number, own?: boolean): void;
  drainOutbox(): { ops: Op[]; seq: number } | null;

  canEditNow(): boolean;
  visibleElements(): BoardElement[];
}

const DEFAULT_CONFIG: ToolConfig = {
  color: DrawingPalette[0],
  width: StrokeSizes[1],
  filled: false,
  shape: 'rectangle',
  fontSize: 28,
  bold: false,
  italic: false,
};

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, scale: 1 };

const clampWidth = (w: number) =>
  Math.max(LIMITS.minStrokeWidth, Math.min(LIMITS.maxStrokeWidth, w));

export const useBoardStore = create<BoardState>((set, get) => {
  function commitLocal(ops: Op[]) {
    // Offline, an edit would only ever exist on this screen — and vanish on
    // the reconnect's hydrate. Refusing it is what makes the banner honest.
    if (ops.length === 0 || get().connection !== 'online') return;
    const { elements, undoStack, outbox, clientSeq } = get();
    // The inverse has to be computed against the state the ops are about to
    // change, so this runs before they are applied.
    const undo = invertOps(elements, ops);
    set({
      elements: applyOps(elements, ops),
      outbox: [...outbox, ...ops],
      clientSeq: clientSeq + 1,
      // 100 steps is deep enough to feel unlimited without holding a whole
      // session's elements alive in memory.
      undoStack: [...undoStack.slice(-99), { undo, redo: ops }],
      redoStack: [],
    });
  }

  /**
   * Local paint order. The server overwrites `z` when it broadcasts, so this
   * only has to be right until the echo comes back.
   */
  function nextZ(): number {
    const z = get().zCounter + 1;
    set({ zCounter: z });
    return z;
  }

  function baseFields() {
    const now = Date.now();
    return {
      id: shortId(),
      createdBy: get().you?.userId ?? 'local',
      createdAt: now,
      updatedAt: now,
      z: nextZ(),
    };
  }

  return {
    boardId: null,
    meta: null,
    you: null,
    participants: [],
    connection: 'idle',
    serverSeq: 0,
    boardToken: null,

    elements: {},
    zCounter: 0,

    tool: 'pen',
    config: DEFAULT_CONFIG,
    camera: DEFAULT_CAMERA,

    outbox: [],
    clientSeq: 0,
    undoStack: [],
    redoStack: [],

    /** Replaces local state wholesale with the server's `joined` payload. */
    hydrate({ meta, elements, participants, you, seq }) {
      const map: ElementMap = {};
      let maxZ = 0;
      for (const el of elements) {
        map[el.id] = el;
        if (el.z > maxZ) maxZ = el.z;
      }
      set({
        boardId: meta.id,
        meta,
        you,
        participants,
        elements: map,
        zCounter: maxZ,
        serverSeq: seq,
        // History and pending ops belong to the old session, not this one.
        undoStack: [],
        redoStack: [],
        outbox: [],
      });
    },

    reset() {
      set({
        boardId: null,
        meta: null,
        you: null,
        participants: [],
        connection: 'idle',
        boardToken: null,
        elements: {},
        zCounter: 0,
        outbox: [],
        clientSeq: 0,
        serverSeq: 0,
        undoStack: [],
        redoStack: [],
        camera: DEFAULT_CAMERA,
      });
    },

    setConnection(status) {
      set({ connection: status });
    },

    setParticipants(list) {
      set({ participants: list });
    },

    setMeta(meta, you) {
      set((s) => ({ meta, you: you ?? s.you }));
    },

    setBoardToken(token) {
      set({ boardToken: token });
    },

    setRemoteCursor(userId, at) {
      set((s) => ({
        participants: s.participants.map((p) => (p.userId === userId ? { ...p, cursor: at } : p)),
      }));
    },

    setTool(tool) {
      set({ tool });
    },

    setConfig(patch) {
      set((s) => ({ config: { ...s.config, ...patch } }));
    },

    setCamera(camera) {
      set({ camera });
    },

    // --- editing -----------------------------------------------------------
    // Each of these turns a gesture into ops. They all no-op without edit
    // rights, so a viewer's gestures die here rather than being drawn locally
    // and then rejected by the server a moment later.

    addStroke(points) {
      if (!get().canEditNow() || points.length < 4) return;
      const { config } = get();
      const el: StrokeElement = {
        ...baseFields(),
        kind: 'stroke',
        // Two numbers per point, so the cap is doubled.
        points: points.slice(0, LIMITS.maxStrokePoints * 2),
        color: config.color,
        width: clampWidth(config.width),
      };
      commitLocal([{ t: 'add', el }]);
    },

    addShape(shape, from, to) {
      if (!get().canEditNow()) return;
      const { config } = get();
      const el: ShapeElement = {
        ...baseFields(),
        kind: 'shape',
        shape,
        from,
        to,
        stroke: config.color,
        strokeWidth: clampWidth(config.width),
        fill: config.filled && isFillable(shape) ? fillFor(config.color) : null,
      };
      commitLocal([{ t: 'add', el }]);
    },

    /**
     * The paint bucket. There are no regions to flood on a vector board, so
     * "fill" means: find the topmost enclosed shape under the pointer and tint
     * it. Returns whether anything was hit, so the caller can tell a hit from a
     * miss.
     */
    fillAt(at) {
      if (!get().canEditNow()) return false;
      const visible = get().visibleElements();
      for (let i = visible.length - 1; i >= 0; i--) {
        const el = visible[i];
        if (el.kind !== 'shape' || !isFillable(el.shape)) continue;
        const minX = Math.min(el.from.x, el.to.x);
        const maxX = Math.max(el.from.x, el.to.x);
        const minY = Math.min(el.from.y, el.to.y);
        const maxY = Math.max(el.from.y, el.to.y);
        if (at.x < minX || at.x > maxX || at.y < minY || at.y > maxY) continue;
        const fill = fillFor(get().config.color);
        if (el.fill === fill) return false;
        commitLocal([
          {
            t: 'update',
            id: el.id,
            patch: { fill } as Partial<BoardElement>,
            updatedAt: Date.now(),
          },
        ]);
        return true;
      }
      return false;
    },

    /** Returns the new id so the caller can open the text editor on it. */
    addText(at) {
      if (!get().canEditNow()) return null;
      const { config } = get();
      const el: TextElement = {
        ...baseFields(),
        kind: 'text',
        at,
        text: '',
        color: config.color,
        fontSize: config.fontSize,
        bold: config.bold,
        italic: config.italic,
      };
      commitLocal([{ t: 'add', el }]);
      return el.id;
    },

    updateText(id, patch) {
      const current = get().elements[id];
      if (!current || current.kind !== 'text' || !get().canEditNow()) return;

      const clean =
        patch.text !== undefined
          ? { ...patch, text: patch.text.slice(0, LIMITS.maxTextLength) }
          : patch;

      // Clearing the text removes the element — an empty label is just litter.
      if (clean.text === '') {
        commitLocal([{ t: 'delete', id }]);
        return;
      }
      commitLocal([
        { t: 'update', id, patch: clean as Partial<BoardElement>, updatedAt: Date.now() },
      ]);
    },

    addImage(at, width, height, uri) {
      if (!get().canEditNow()) return;
      commitLocal([{ t: 'add', el: { ...baseFields(), kind: 'image', at, width, height, uri } }]);
    },

    eraseAt(at, radius = 12) {
      if (!get().canEditNow()) return;
      const hits = hitTest(get().visibleElements(), at, radius);
      if (hits.length) commitLocal(hits.map((id) => ({ t: 'delete', id }) as Op));
    },

    clearBoard() {
      if (!get().canEditNow()) return;
      commitLocal([{ t: 'clear' }]);
    },

    // --- history -----------------------------------------------------------
    // Undo and redo replay stored ops through the outbox like any other edit,
    // so collaborators see them as ordinary changes.

    undo() {
      const { undoStack, redoStack, elements, outbox } = get();
      const entry = undoStack[undoStack.length - 1];
      if (!entry || get().connection !== 'online') return;
      set({
        elements: applyOps(elements, entry.undo),
        outbox: [...outbox, ...entry.undo],
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, entry],
      });
    },

    redo() {
      const { undoStack, redoStack, elements, outbox } = get();
      const entry = redoStack[redoStack.length - 1];
      if (!entry || get().connection !== 'online') return;
      set({
        elements: applyOps(elements, entry.redo),
        outbox: [...outbox, ...entry.redo],
        redoStack: redoStack.slice(0, -1),
        undoStack: [...undoStack, entry],
      });
    },

    applyRemote(ops, seq, own = false) {
      set((s) => {
        let elements = s.elements;
        if (own) {
          // The server owns `z` (model/ops.ts): without taking it back here a
          // local element keeps its provisional z and sits under everything
          // drawn later by others, however long ago it was actually drawn.
          const next = { ...elements };
          for (const op of ops) {
            if (op.t !== 'add') continue;
            const current = next[op.el.id];
            if (current) next[op.el.id] = { ...current, z: op.el.z };
          }
          elements = next;
        } else {
          elements = applyOps(elements, ops);
        }
        // New local elements must land above everything seen so far, remote too.
        let zCounter = s.zCounter;
        for (const op of ops) if (op.t === 'add' && op.el.z > zCounter) zCounter = op.el.z;
        return { elements, zCounter, serverSeq: Math.max(s.serverSeq, seq) };
      });
    },

    /** Hands the queued ops to the caller and clears them in one step. */
    drainOutbox() {
      const { outbox, clientSeq } = get();
      if (outbox.length === 0) return null;
      set({ outbox: [] });
      return { ops: outbox, seq: clientSeq };
    },

    canEditNow() {
      const { meta, you } = get();
      return canEdit(meta, you?.userId ?? null);
    },

    visibleElements() {
      return visibleSorted(get().elements);
    },
  };
});

/** Screen (CSS pixel, canvas-relative) coordinates -> board coordinates. */
export function screenToBoard(x: number, y: number, camera?: Camera): Point {
  const c = camera ?? useBoardStore.getState().camera;
  return { x: (x - c.x) / c.scale, y: (y - c.y) / c.scale };
}

/** Board coordinates -> screen (CSS pixel, canvas-relative) coordinates. */
export function boardToScreen(x: number, y: number, camera: Camera): Point {
  return { x: x * camera.scale + camera.x, y: y * camera.scale + camera.y };
}
