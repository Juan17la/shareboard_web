# Live Whiteboard — Web

React + TypeScript + Vite + Tailwind v4 client for the collaborative whiteboard.
It is a standalone project: it talks to `../server` only over HTTP and WebSocket.

## Run

```bash
cp .env.example .env.local   # point at the server if it is not on :3000
npm install
npm run dev                  # http://localhost:5173
```

The Fastify server in `../server` must be running.

## Routes

| Route | Purpose |
|---|---|
| `/` | pick a nickname, create a board or join by short code |
| `/b/:code` | shareable link — resolves the code and redirects |
| `/board/:id` | the board itself |

## Layout

```
src/
  lib/contract.ts   backend contract (types, limits, permission rules)
  lib/config.ts     API/WS URLs and realtime tunables
  lib/api.ts        REST client, one function per endpoint
  lib/socket.ts     WebSocket with heartbeat, backoff and a 50 ms op outbox
  lib/session.ts    persistent userId + nickname (localStorage)
  hooks/use-board.ts  join -> socket -> live board state
  components/       Canvas (SVG) and shared UI primitives
  pages/            Home, Board, ShortCode
```

Design tokens from `../mobile/docs/03-styles` live in `src/index.css`; they
follow the OS light/dark setting.

## Scope

The canvas implements the pen tool, live presence and remote cursors — enough to
exercise the whole realtime path. Shapes, text and images are rendered when they
arrive from other clients, but there is no UI yet to create them.
