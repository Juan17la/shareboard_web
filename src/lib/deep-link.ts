/**
 * Share-link parsing, so the join field accepts whatever someone pastes into
 * it (mobile/docs/02-backend-connection):
 *
 *   - https://<host>/b/<code>
 *   - https://<host>/board/<id>
 *   - shareboard://board/<id>      (the mobile deep link)
 *   - a bare short code ("ABC234")
 *   - a bare board id
 */
import { isValidShortCode, normalizeShortCode } from './short-code';

export type ParsedBoardRef =
  | { kind: 'id'; boardId: string }
  | { kind: 'code'; shortCode: string }
  | null;

export function parseBoardRef(raw: string): ParsedBoardRef {
  const input = raw.trim();
  if (!input) return null;

  // Try URL forms first.
  try {
    const url = new URL(input);
    const segments = url.pathname.split('/').filter(Boolean);
    const [head, value] = segments;
    if ((head === 'b' || head === 'code') && value) {
      return { kind: 'code', shortCode: normalizeShortCode(value) };
    }
    if ((head === 'board' || url.host === 'board') && value) {
      return { kind: 'id', boardId: value };
    }
    // shareboard://board/<id> parses with host === 'board'
    if (url.protocol === 'shareboard:' && segments.length) {
      return { kind: 'id', boardId: segments[segments.length - 1] };
    }
  } catch {
    // not a URL — fall through
  }

  if (isValidShortCode(input)) return { kind: 'code', shortCode: normalizeShortCode(input) };
  // Assume anything else is a raw board id.
  return { kind: 'id', boardId: input };
}

/** The canonical web share link for a board. */
export const boardShareLink = (webBaseUrl: string, shortCode: string): string =>
  `${webBaseUrl.replace(/\/$/, '')}/b/${shortCode}`;
