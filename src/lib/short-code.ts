/**
 * Board short codes — the 6-character code users type to join a board.
 *
 * Crockford base32 without the ambiguous characters (no I L O U 0 1), so a code
 * read aloud or off a screen is unambiguous. The **backend owns generation and
 * uniqueness** (mobile/docs/02-backend-connection); the client only normalizes
 * and validates what the user types.
 */
export const SHORT_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const SHORT_CODE_LENGTH = 6;

/** Uppercases and strips the spaces, dashes or dots a user may have typed. */
export const normalizeShortCode = (input: string): string =>
  input.trim().toUpperCase().replace(/[\s\-·.]/g, '');

/** For display only: `ABC·DEF` reads as two short chunks. Copy/share the raw code. */
export const formatShortCode = (code: string): string =>
  code.length === SHORT_CODE_LENGTH ? `${code.slice(0, 3)}·${code.slice(3)}` : code;

export function isValidShortCode(input: string): boolean {
  const code = normalizeShortCode(input);
  return (
    code.length === SHORT_CODE_LENGTH && [...code].every((c) => SHORT_CODE_ALPHABET.includes(c))
  );
}
