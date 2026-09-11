/** Runtime configuration. Override through `.env.local` (see .env.example). */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000/ws';

/**
 * Where share links point. The app serves its own links, so the browser's
 * origin is right in every deployment — including a LAN address or a tunnel,
 * which a hard-coded value would get wrong.
 */
export const WEB_BASE_URL =
  typeof window === 'undefined' ? '' : window.location.origin;

/** Realtime tunables, matching mobile/docs/07-websockets. */
export const REALTIME = {
  /** Flush the local op outbox at most this often (ms). */
  outboxFlushMs: 50,
  /** Heartbeat ping interval (ms). */
  heartbeatMs: 20_000,
  /** Cursor broadcast throttle (ms). */
  cursorThrottleMs: 45,
  /** Reconnect backoff: min, max, multiplier. */
  backoffMinMs: 500,
  backoffMaxMs: 15_000,
  backoffFactor: 2,
} as const;
