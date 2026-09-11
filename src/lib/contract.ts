/**
 * The whiteboard data model — the contract this app shares with the Node
 * backend (`server/src/model/types.ts`) and the Expo client
 * (`mobile/src/features/board/model.ts`). Documented in mobile/docs/05-model-date.
 *
 * The three projects each keep their own copy rather than importing a shared
 * package, so none of them depends on the others at build time. The cost is
 * that a change here must be mirrored in the other two.
 *
 * Two conventions run through the whole model. Elements are discriminated by
 * `kind` and carry a `z` for paint order, which the server reassigns on `add`
 * so concurrent draws from different clients cannot land on the same layer.
 * And deletes are *soft* (`deleted: true`) rather than removals, so a delete
 * arriving twice, or out of order against an edit, still converges everywhere.
 */

export type UserId = string;
export type ElementId = string;
export type BoardAccess = 'public' | 'private';
export type EditPolicy = 'everyone' | 'selected' | 'creator-only';
export type Role = 'creator' | 'editor' | 'viewer';

export type ShapeKind = 'rectangle' | 'ellipse' | 'triangle' | 'line' | 'arrow';

/**
 * The active tool. The shape *kind* is not a tool — the rail has one "shapes"
 * button and the kind is picked in its options panel (`ToolConfig.shape`),
 * which is how the design lays it out and what keeps the rail to five buttons.
 */
export type ToolType = 'pen' | 'eraser' | 'shape' | 'text' | 'fill';

/** Shape kinds that enclose an area, and so can carry a fill. */
export const FILLABLE_SHAPES: ShapeKind[] = ['rectangle', 'ellipse', 'triangle'];

export const isFillable = (shape: ShapeKind): boolean => FILLABLE_SHAPES.includes(shape);

export interface Point {
  x: number;
  y: number;
}

export interface ElementBase {
  id: ElementId;
  createdBy: UserId;
  createdAt: number;
  updatedAt: number;
  z: number;
  deleted?: boolean;
}

export interface StrokeElement extends ElementBase {
  kind: 'stroke';
  /** Flat [x0, y0, x1, y1, ...] — half the JSON of an array of objects. */
  points: number[];
  color: string;
  width: number;
}

export interface ShapeElement extends ElementBase {
  kind: 'shape';
  shape: ShapeKind;
  from: Point;
  to: Point;
  stroke: string;
  strokeWidth: number;
  fill?: string | null;
}

export interface TextElement extends ElementBase {
  kind: 'text';
  at: Point;
  text: string;
  color: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
}

export interface ImageElement extends ElementBase {
  kind: 'image';
  at: Point;
  width: number;
  height: number;
  /** Remote URL or a data: URI. */
  uri: string;
}

export type BoardElement = StrokeElement | ShapeElement | TextElement | ImageElement;

export interface BoardMeta {
  id: string;
  shortCode: string;
  name: string;
  access: BoardAccess;
  editPolicy: EditPolicy;
  /** userIds allowed to edit when editPolicy is 'selected'. */
  editors: UserId[];
  creatorId: UserId;
  /** Whether a PIN is set. The PIN itself never leaves the server. */
  hasPin: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Participant {
  userId: UserId;
  nickname: string;
  /** Presence color, assigned by the server on join. */
  color: string;
  role: Role;
  /** Latest known position; never persisted. */
  cursor?: Point;
  lastSeen: number;
}

/** The unit of change. Every edit becomes one of these, local or remote. */
export type Op =
  | { t: 'add'; el: BoardElement }
  | { t: 'update'; id: ElementId; patch: Partial<BoardElement>; updatedAt: number }
  | { t: 'delete'; id: ElementId }
  | { t: 'clear' };

export const SNAPSHOT_FORMAT = 'live-whiteboard' as const;
export const SNAPSHOT_VERSION = 1 as const;

/** The export/import file format. `version` only rises on a breaking change. */
export interface BoardSnapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: typeof SNAPSHOT_VERSION;
  meta: { name: string };
  /** Visible elements only, sorted by z. */
  elements: BoardElement[];
  exportedAt: number;
}

/** Enforced on both ends: the client keeps the UI honest, the server decides. */
export const LIMITS = {
  maxElements: 5000,
  maxStrokePoints: 2000,
  maxTextLength: 2000,
  minStrokeWidth: 1,
  maxStrokeWidth: 64,
  minFontSize: 10,
  maxFontSize: 96,
  maxNicknameLength: 24,
  maxBoardNameLength: 80,
  /** #RRGGBB, or #RRGGBBAA for the translucent fills the shape tool paints. */
  colorPattern: /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/,
} as const;

/** Presence colors, handed out by the server in join order. */
export const PRESENCE_COLORS = [
  '#E5484D',
  '#F76808',
  '#30A46C',
  '#208AEF',
  '#8E4EC6',
  '#0EA5E9',
] as const;

// --- WebSocket wire protocol ------------------------------------------------
// Mirrors `server/src/model/protocol.ts`; plain JSON frames over a standard
// WebSocket, one socket per (board, tab). See mobile/docs/07-websockets.

export type ClientMessage =
  | { type: 'join'; boardId: string; userId: UserId; nickname: string; pin?: string }
  /** `seq` is this client's own counter, echoed back for debugging. */
  | { type: 'op'; boardId: string; ops: Op[]; seq: number }
  | { type: 'cursor'; boardId: string; at: Point }
  | { type: 'leave'; boardId: string }
  | { type: 'ping'; t: number };

export type ServerMessage =
  | {
      type: 'joined';
      meta: BoardMeta;
      elements: BoardElement[];
      participants: Participant[];
      you: Participant;
      seq: number;
    }
  /** `seq` is the board-wide monotonic counter; apply in order. */
  | { type: 'op'; ops: Op[]; from: UserId; seq: number }
  | { type: 'participants'; participants: Participant[] }
  | { type: 'cursor'; from: UserId; at: Point }
  | { type: 'permissions'; meta: BoardMeta; you: Participant }
  | { type: 'error'; code: ServerErrorCode; message: string }
  | { type: 'pong'; t: number };

export type ClientMessageType = ClientMessage['type'];
export type ServerMessageType = ServerMessage['type'];

export type ServerErrorCode =
  | 'BOARD_NOT_FOUND'
  | 'PIN_REQUIRED'
  | 'PIN_INVALID'
  | 'FORBIDDEN'
  | 'NICKNAME_TAKEN'
  | 'RATE_LIMITED'
  | 'VALIDATION'
  | 'INTERNAL';

/** Close codes the client must not reconnect after — except RATE_LIMITED. */
export const CloseCode = {
  BAD_REQUEST: 4000,
  /** Another session took this (userId, boardId) slot. */
  REPLACED: 4001,
  FORBIDDEN: 4003,
  NOT_FOUND: 4004,
  RATE_LIMITED: 4008,
  PIN_REQUIRED: 4009,
} as const;

/** Server-side limits the client stays under. */
export const REALTIME_LIMITS = {
  idleTimeoutMs: 40_000,
  maxMessageBytes: 256 * 1024,
  maxOpsPerSecond: 60,
} as const;

/**
 * Permission rules, mirroring `server/src/model/rules.ts`. The server is the
 * authority — it re-checks every op — but the UI needs the same answer locally
 * to hide tools without a round trip. Both arguments are nullable because the
 * store asks these before a board has finished loading.
 */
export function roleFor(meta: BoardMeta | null, userId: UserId | null): Role {
  if (!meta || !userId) return 'viewer';
  if (userId === meta.creatorId) return 'creator';
  if (meta.editPolicy === 'everyone') return 'editor';
  if (meta.editPolicy === 'selected' && meta.editors.includes(userId)) return 'editor';
  return 'viewer';
}

export function canEdit(meta: BoardMeta | null, userId: UserId | null): boolean {
  return roleFor(meta, userId) !== 'viewer';
}
