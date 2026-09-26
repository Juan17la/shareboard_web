/**
 * Bringing content in.
 *
 * The design's import sheet is one "Choose file" button plus a *Restore
 * editable strokes and text* switch, and both branches start from the same
 * place: a file the user picked. What happens next depends on what the bytes
 * actually are, not on the file's name —
 *
 *   a `.json` snapshot     -> a new board with every element editable
 *   a Shareboard PNG/JPG   -> the same, read back out of the picture
 *                             (`lib/embed.ts`), unless the switch is off
 *   any other picture      -> placed on the board as one flat image
 *
 * The flat-image path has a hard constraint behind it. An image element carries
 * its bytes inline as a `data:` URI, and that element travels to the server
 * inside a normal `op` frame — which the socket caps at 256 KB
 * (`REALTIME_LIMITS.maxMessageBytes`). A photo straight off a modern phone is
 * several megabytes, so sending one unmodified does not fail gracefully: the
 * WebSocket layer drops the connection with close code 1009 before the server
 * ever sees the message, the client reconnects, and the image is silently lost.
 *
 * So a picked image is always re-encoded down to something that fits, and if
 * even the smallest attempt is too big it is refused with a readable error
 * rather than being put on the wire. See mobile/docs/06-loading-exporting.
 */
import { detectContainer, extractSnapshot } from '../lib/embed';
import { parseSnapshot, SnapshotParseError } from '../lib/serialization';
import type { BoardSnapshot } from '../lib/contract';

export interface ImportedImage {
  kind: 'image';
  uri: string;
  width: number;
  height: number;
}

export type ImportResult = { kind: 'snapshot'; snapshot: BoardSnapshot } | ImportedImage;

/**
 * Budget for an embedded image. The 256 KB frame also has to hold the op
 * envelope, and the outbox may batch this op together with others, so this
 * leaves a wide margin rather than creeping up to the true ceiling.
 */
const MAX_IMAGE_BYTES = 160 * 1024;

/** Tried in order, largest first; the first result that fits is used. */
const ENCODE_ATTEMPTS = [
  { size: 1024, quality: 0.6 },
  { size: 800, quality: 0.5 },
  { size: 640, quality: 0.4 },
];

/** The file types the picker offers. `*` stays out: the bytes decide anyway. */
export const IMPORT_ACCEPT = '.json,application/json,image/png,image/jpeg';
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

/**
 * Reads a picked file and decides what it is.
 *
 * `restoreEditable` is the sheet's switch: with it off, a Shareboard image is
 * treated as an ordinary picture even though it is carrying a board.
 */
export async function readBoardFile(
  file: File,
  restoreEditable: boolean,
): Promise<ImportResult> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new SnapshotParseError('Could not read the selected file.');
  }

  const container = detectContainer(bytes);

  if (container === 'json') {
    return { kind: 'snapshot', snapshot: parseSnapshot(new TextDecoder().decode(bytes)) };
  }

  if (container === 'png' || container === 'jpg') {
    if (restoreEditable) {
      const embedded = extractSnapshot(bytes);
      if (embedded) return { kind: 'snapshot', snapshot: embedded };
    }
    return shrinkToElement(file);
  }

  throw new SnapshotParseError('That file is not a Shareboard board or an image.');
}

/** Re-encodes a picture until it fits inside one realtime frame. */
export async function shrinkToElement(file: File): Promise<ImportedImage> {
  const bitmap = await decode(file);
  // Constraining the *longer* edge is what keeps a tall photo from coming back
  // with far more pixels than a wide one at the same nominal "size".
  const longest = Math.max(bitmap.width, bitmap.height);

  for (const attempt of ENCODE_ATTEMPTS) {
    const scale = Math.min(1, attempt.size / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    // A JPEG has no alpha, so a transparent PNG would come out black without a
    // white ground painted under it first.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const uri = canvas.toDataURL('image/jpeg', attempt.quality);
    // The base64 body is ASCII, so one character is one byte on the wire.
    if (uri.length - uri.indexOf(',') <= MAX_IMAGE_BYTES) {
      return { kind: 'image', uri, width, height };
    }
  }

  throw new Error(
    'That image is too detailed to add to a board. Try a smaller image, or crop it first.',
  );
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Safari has refused some formats here; fall through to the <img> path.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Scales a picked picture down to something that fits on screen at 100% zoom. */
export function placementSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, 600 / Math.max(width, height));
  return { width: width * scale, height: height * scale };
}
