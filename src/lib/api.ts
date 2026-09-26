/**
 * REST client. One function per endpoint in mobile/docs/02-backend-connection;
 * every failure surfaces as an `ApiError` carrying the server's error code.
 *
 * Auth model: no accounts. The browser generates a persistent `userId` and
 * sends it as `X-User-Id`; `POST /boards/:id/join` returns a short-lived
 * `boardToken` that owner-only calls (rename, permissions, snapshot, delete)
 * send as `Authorization: Bearer`.
 */
import { API_BASE_URL } from './config';
import type {
  BoardAccess,
  BoardMeta,
  BoardSnapshot,
  EditPolicy,
  Participant,
  Point,
  UserId,
} from './contract';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  userId?: string;
  token?: string;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.userId) headers['X-User-Id'] = opts.userId;
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    throw new ApiError('NETWORK', (err as Error).message || 'Network request failed', 0);
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const body = data as { error?: { code: string; message: string } } | null;
    throw new ApiError(
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }
  return data as T;
}

export interface CreateBoardRequest {
  name: string;
  access: BoardAccess;
  editPolicy: EditPolicy;
  /** Required when access === 'private'. */
  pin?: string;
  creatorId: UserId;
}

export interface JoinBoardRequest {
  boardId: string;
  userId: UserId;
  nickname: string;
  pin?: string;
  /**
   * The presence colour picked on the identity screen. Advisory: the server
   * honours it unless someone already on the board has that colour, so the
   * value that comes back in `you.color` is the one to trust.
   */
  color?: string;
  /** Presence icon picked on the identity screen. */
  avatar?: string;
}

export interface JoinBoardResponse {
  /** Short-lived token the client must present on the WebSocket. */
  boardToken: string;
  meta: BoardMeta;
  you: Participant;
}

export interface UpdatePermissionsRequest {
  access?: BoardAccess;
  editPolicy?: EditPolicy;
  editors?: UserId[];
  /** Set/replace the PIN; null clears it. */
  pin?: string | null;
}

export interface Auth {
  userId: UserId;
  token: string;
}

export const createBoard = (body: CreateBoardRequest) =>
  request<BoardMeta>('/boards', { method: 'POST', body, userId: body.creatorId });

export const getBoard = (id: string) => request<BoardMeta>(`/boards/${id}`);

export const resolveShortCode = async (code: string) =>
  (await request<{ boardId: string }>(`/boards/code/${encodeURIComponent(code)}`)).boardId;

export const joinBoard = (body: JoinBoardRequest) =>
  request<JoinBoardResponse>(`/boards/${body.boardId}/join`, {
    method: 'POST',
    body,
    userId: body.userId,
  });

export const renameBoard = (id: string, name: string, auth: Auth) =>
  request<BoardMeta>(`/boards/${id}`, { method: 'PATCH', body: { name }, ...auth });

/** Creator only. Everyone else on the board is disconnected by the server. */
export const deleteBoard = (id: string, auth: Auth) =>
  request<void>(`/boards/${id}`, { method: 'DELETE', ...auth });

export const updatePermissions = (id: string, patch: UpdatePermissionsRequest, auth: Auth) =>
  request<BoardMeta>(`/boards/${id}/permissions`, { method: 'PATCH', body: patch, ...auth });

/** Server-side snapshot. Members only, so it needs the token from `join`. */
export const getSnapshot = (id: string, auth: Auth) =>
  request<BoardSnapshot>(`/boards/${id}/snapshot`, auth);

/** Draws `prompt` centred on `at` (board coords); the elements arrive over the socket. */
export const drawWithAi = (id: string, prompt: string, at: Point, auth: Auth) =>
  request<{ reply: string; added: number }>(`/boards/${id}/ai`, {
    method: 'POST',
    body: { prompt, at },
    ...auth,
  });

export const importSnapshot = (snapshot: BoardSnapshot, creatorId: UserId) =>
  request<BoardMeta>('/boards/import', {
    method: 'POST',
    body: { snapshot, creatorId },
    userId: creatorId,
  });
