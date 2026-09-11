/** Ids. `crypto.randomUUID` is available in every browser this app targets. */

/** Stable per-browser user id, generated once and persisted by the session. */
export const newUserId = (): string => crypto.randomUUID();

/** Short element id: unique enough within one board, and cheap on the wire. */
export const shortId = (): string => crypto.randomUUID().replace(/-/g, '').slice(0, 12);
