/**
 * Taking the board out: as a picture, or as an editable file.
 *
 * Exporting an infinite board means choosing a frame, and the tightest frame
 * around what was actually drawn is the one nobody has to think about — so the
 * render is cropped to `contentBounds` with a little padding. The image is
 * drawn through the same `paintBoard` the live canvas uses, so an export cannot
 * drift from what was on screen.
 *
 * The saved picture carries the board's snapshot inside it (`lib/embed.ts`), so
 * the same file opens as an image in any viewer and comes back editable in
 * Shareboard — on the phone as well as here.
 */
import type { BoardElement, BoardSnapshot } from '../lib/contract';
import { embedSnapshot } from '../lib/embed';
import { contentBounds } from '../lib/geometry';
import { paintBoard } from '../components/board/renderer';

export type ImageFormat = 'png' | 'jpg';

/** Padding around the drawn content, in board units at 1× zoom. */
const PADDING = 24;
/** Beyond this the export is scaled down: a huge board must still produce a
 *  file a browser can hold in memory and an email can carry. */
const MAX_EDGE = 4096;

export interface RenderedBoard {
  blob: Blob;
  width: number;
  height: number;
}

/** A `slug-case` file name from the board's own name. */
export function fileNameFor(boardName: string, extension: string): string {
  const slug =
    boardName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'shareboard';
  return `${slug}.${extension}`;
}

export interface ExportSize {
  width: number;
  height: number;
  scale: number;
}

/** The pixel size an export of these elements would come out at. */
export function exportSize(elements: BoardElement[]): ExportSize | null {
  const bounds = contentBounds(elements);
  if (!bounds) return null;
  const width = Math.max(1, Math.ceil(bounds.width + PADDING * 2));
  const height = Math.max(1, Math.ceil(bounds.height + PADDING * 2));
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/**
 * Renders the board to an image. `transparent` only means anything for PNG —
 * JPEG has no alpha channel, so a transparent request there would come out
 * black, and the caller is expected to have disabled the switch.
 */
export async function renderBoardImage(options: {
  elements: BoardElement[];
  snapshot: BoardSnapshot;
  format: ImageFormat;
  transparent: boolean;
  /** Multiplies the pixel size, for a crisper file than the on-screen size. */
  pixelRatio?: number;
}): Promise<RenderedBoard> {
  const bounds = contentBounds(options.elements);
  const size = exportSize(options.elements);
  if (!bounds || !size) throw new Error('The board is empty');

  const ratio = options.pixelRatio ?? 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size.width * ratio);
  canvas.height = Math.round(size.height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser could not create the export canvas');

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const paintScale = size.scale;
  paintBoard(ctx, {
    elements: options.elements,
    // The camera frames the content: shift the bounding box to the origin, then
    // scale to fit the capped export size.
    camera: {
      x: (PADDING - bounds.x) * paintScale,
      y: (PADDING - bounds.y) * paintScale,
      scale: paintScale,
    },
    width: size.width,
    height: size.height,
    smooth: true,
    // The grid is a working aid, not content: it never goes into an export.
    grid: false,
    background: options.transparent && options.format === 'png' ? null : '#FFFFFF',
    onImageReady: () => {},
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(
      resolve,
      options.format === 'png' ? 'image/png' : 'image/jpeg',
      options.format === 'png' ? undefined : 0.92,
    ),
  );
  if (!blob) throw new Error('This browser could not encode the image');

  // Tuck the snapshot inside the encoded bytes.
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const withSnapshot = embedSnapshot(bytes, options.format, options.snapshot);

  return {
    blob: new Blob([withSnapshot as BlobPart], {
      type: options.format === 'png' ? 'image/png' : 'image/jpeg',
    }),
    width: size.width,
    height: size.height,
  };
}

/** Hands a blob to the browser as a download. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers; a tick is
  // enough for the navigation to have been handed off.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSnapshot(snapshot: BoardSnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  downloadBlob(blob, fileNameFor(snapshot.meta.name, 'json'));
}

/**
 * Puts the image on the clipboard, so it can be pasted straight into a slide
 * deck or a chat. This is the web's answer to the mobile share sheet — but only
 * PNG is writable, and Firefox has no `ClipboardItem` at all, so the caller
 * must be ready for a rejection and fall back to a download.
 */
export async function copyImageToClipboard(blob: Blob): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('This browser cannot copy images');
  }
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}
