/**
 * Board WebSocket: heartbeat, exponential backoff with jitter, and typed
 * handlers per message (mobile/docs/07-websockets).
 *
 * Every socket must send `join` first — including after a reconnect, since that
 * is a new socket — so `connect()` does it in `onopen` every time. A second
 * socket for the same `(userId, boardId)` closes the first with code 4001; that
 * code, like 4000/4003/4004/4009, must not be retried.
 */
import { REALTIME, WS_URL } from './config';
import {
  CloseCode,
  type ClientMessage,
  type Point,
  type ServerMessage,
  type ServerMessageType,
} from './contract';

export type ConnectionState = 'idle' | 'connecting' | 'online' | 'offline';

interface Options {
  boardId: string;
  token: string;
  userId: string;
  nickname: string;
  pin?: string;
}

type Handler<K extends ServerMessageType> = (msg: Extract<ServerMessage, { type: K }>) => void;

/** Close codes that mean "do not reconnect on your own". */
const FATAL: number[] = [
  CloseCode.BAD_REQUEST,
  CloseCode.REPLACED,
  CloseCode.FORBIDDEN,
  CloseCode.NOT_FOUND,
  CloseCode.PIN_REQUIRED,
];

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private heartbeat: number | null = null;
  private retryTimer: number | null = null;
  private attempt = 0;
  private closed = false;
  private state: ConnectionState = 'idle';

  private readonly handlers = new Map<ServerMessageType, Set<(msg: never) => void>>();
  private onState: ((state: ConnectionState) => void) | null = null;
  private readonly opts: Options;

  constructor(opts: Options) {
    this.opts = opts;
  }

  on<K extends ServerMessageType>(type: K, handler: Handler<K>): void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler as (msg: never) => void);
    this.handlers.set(type, set);
  }

  onStateChange(listener: (state: ConnectionState) => void): void {
    this.onState = listener;
  }

  getState(): ConnectionState {
    return this.state;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.onState?.(state);
  }

  private emit(msg: ServerMessage): void {
    const set = this.handlers.get(msg.type);
    if (!set) return;
    for (const handler of set) (handler as (m: ServerMessage) => void)(msg);
  }

  connect(): void {
    if (this.closed) return;
    this.stopTimers();
    this.setState('connecting');

    const url = `${WS_URL}?boardId=${encodeURIComponent(this.opts.boardId)}&token=${encodeURIComponent(this.opts.token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.send({
        type: 'join',
        boardId: this.opts.boardId,
        userId: this.opts.userId,
        nickname: this.opts.nickname,
        ...(this.opts.pin ? { pin: this.opts.pin } : {}),
      });
      this.heartbeat = window.setInterval(
        () => this.send({ type: 'ping', t: Date.now() }),
        REALTIME.heartbeatMs,
      );
    };

    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data as string) as ServerMessage;
      } catch {
        return;
      }
      // 'online' means "the server has us on the board", not "the socket
      // opened": until `joined` lands there is no board state to show.
      if (msg.type === 'joined') this.setState('online');
      if (msg.type !== 'pong') this.emit(msg);
    };

    ws.onclose = (ev) => {
      this.stopTimers();
      this.setState('offline');
      if (this.closed || FATAL.includes(ev.code)) return;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    const base = Math.min(
      REALTIME.backoffMinMs * REALTIME.backoffFactor ** this.attempt,
      REALTIME.backoffMaxMs,
    );
    this.attempt += 1;
    // Jitter keeps a roomful of tablets from all reconnecting on the same tick.
    const delay = base * (1 + Math.random() * 0.3);
    this.retryTimer = window.setTimeout(() => this.connect(), delay);
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  sendCursor(at: Point): void {
    this.send({ type: 'cursor', boardId: this.opts.boardId, at });
  }

  private stopTimers(): void {
    if (this.heartbeat !== null) window.clearInterval(this.heartbeat);
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.heartbeat = null;
    this.retryTimer = null;
  }

  close(): void {
    this.closed = true;
    this.stopTimers();
    this.send({ type: 'leave', boardId: this.opts.boardId });
    this.ws?.close(1000, 'Left the board');
    this.ws = null;
  }
}
