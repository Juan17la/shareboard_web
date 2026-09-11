/**
 * "Export": the board as a picture.
 *
 * The preview is the real thing at a smaller scale — the same `paintBoard`
 * cropped to the drawing's bounding box that the download runs. Exporting an
 * infinite board means choosing a frame, and the tightest frame around what was
 * actually drawn is the one nobody has to think about.
 *
 * The saved file carries the board's snapshot inside it (`lib/embed.ts`), so
 * the picture can be imported back — here or on a phone — with every stroke
 * still editable.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { useT, useTf } from '../../features/i18n';
import {
  copyImageToClipboard,
  downloadBlob,
  downloadSnapshot,
  exportSize,
  fileNameFor,
  renderBoardImage,
  type ImageFormat,
} from '../../features/export';
import { useBoardStore } from '../../features/board-store';
import { contentBounds } from '../../lib/geometry';
import { visibleSorted } from '../../lib/ops';
import { toSnapshot } from '../../lib/serialization';
import { paintBoard } from '../board/renderer';

import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { Sheet, SheetRow } from '../ui/Sheet';
import { Toggle } from '../ui/Toggle';
import { toast } from '../../lib/toast';

const PADDING = 24;
const PREVIEW_MAX = 240;

export function ExportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet open={open} title={t.sheetExport} onClose={onClose} closeLabel={t.close}>
      {/* The shell mounts with the sheet; the body only when it is open.
          Measuring the board's bounding box is O(points) and the element map
          changes on every stroke, so leaving the body mounted would re-measure
          the whole board continuously while someone is drawing on it — for a
          panel nobody is looking at. */}
      {open ? <ExportSheetBody onClose={onClose} /> : null}
    </Sheet>
  );
}

function ExportSheetBody({ onClose }: { onClose: () => void }) {
  const t = useT();
  const tf = useTf();
  const elements = useBoardStore((s) => s.elements);
  const meta = useBoardStore((s) => s.meta);

  const [format, setFormat] = useState<ImageFormat>('png');
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const list = useMemo(() => visibleSorted(elements), [elements]);
  const bounds = useMemo(() => contentBounds(list), [list]);
  const size = useMemo(() => exportSize(list), [list]);

  // A JPEG has no alpha channel, so "transparent" would silently come out
  // black; the switch is disabled rather than lying about what it does.
  const canBeTransparent = format === 'png';
  const paintBackground = !(transparent && canBeTransparent);

  // The preview redraws whenever the frame, the format or the background
  // changes, at whatever scale fits the card.
  useEffect(() => {
    const canvas = previewRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !bounds) return;

    const full = {
      width: Math.ceil(bounds.width + PADDING * 2),
      height: Math.ceil(bounds.height + PADDING * 2),
    };
    const scale = Math.min(1, PREVIEW_MAX / Math.max(full.width, full.height));
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(full.width * scale));
    const height = Math.max(1, Math.round(full.height * scale));

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    paintBoard(ctx, {
      elements: list,
      camera: { x: (PADDING - bounds.x) * scale, y: (PADDING - bounds.y) * scale, scale },
      width,
      height,
      smooth: true,
      grid: false,
      background: paintBackground ? '#FFFFFF' : null,
      onImageReady: () => {},
    });
  }, [list, bounds, paintBackground]);

  async function run(action: 'download' | 'copy' | 'json') {
    if (!meta) return;
    setBusy(true);
    try {
      const snapshot = toSnapshot(meta.name, elements);
      if (action === 'json') {
        downloadSnapshot(snapshot);
        toast(t.toastExport);
        onClose();
        return;
      }

      const rendered = await renderBoardImage({
        elements: list,
        snapshot,
        format,
        transparent,
      });

      if (action === 'copy') {
        try {
          await copyImageToClipboard(rendered.blob);
          toast(t.toastShared);
          onClose();
          return;
        } catch {
          // Firefox has no image clipboard and Safari refuses JPEG. Falling
          // back to the download is more useful than an error about a feature
          // the user did not ask for by name.
          downloadBlob(rendered.blob, fileNameFor(meta.name, format));
          toast(t.toastExport);
          onClose();
          return;
        }
      }

      downloadBlob(rendered.blob, fileNameFor(meta.name, format));
      toast(t.toastExport);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : t.errExport);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid min-h-[140px] place-items-center overflow-hidden rounded-lg border border-line bg-white p-3"
        style={
          paintBackground
            ? undefined
            : {
                // A checkerboard under a transparent export, so "transparent"
                // is visible rather than indistinguishable from white.
                backgroundImage:
                  'linear-gradient(45deg,#EEF0F6 25%,transparent 25%,transparent 75%,#EEF0F6 75%),linear-gradient(45deg,#EEF0F6 25%,transparent 25%,transparent 75%,#EEF0F6 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px',
              }
        }
      >
        {bounds ? (
          <canvas ref={previewRef} className="block max-w-full" />
        ) : (
          <span className="font-mono text-[11.5px] text-text-tertiary">{t.previewEmpty}</span>
        )}
      </div>

      {size ? (
        <p className="text-center font-mono text-[11px] text-text-secondary">
          {tf('exportSize', { W: size.width, H: size.height, N: list.length })}
        </p>
      ) : null}

      <Segmented
        label={t.sheetExport}
        value={format}
        onChange={setFormat}
        options={[
          { value: 'png' as ImageFormat, label: 'PNG' },
          { value: 'jpg' as ImageFormat, label: 'JPG' },
        ]}
      />

      <SheetRow
        title={t.transparentBg}
        description={canBeTransparent ? undefined : 'JPG'}
        right={
          <Toggle
            value={transparent && canBeTransparent}
            onChange={setTransparent}
            label={t.transparentBg}
            disabled={!canBeTransparent}
          />
        }
      />

      <Button
        label={t.download}
        icon="download"
        onClick={() => void run('download')}
        loading={busy}
        disabled={!bounds}
        fullWidth
      />
      <Button
        label={t.copyImage}
        icon="copy"
        variant="secondary"
        onClick={() => void run('copy')}
        disabled={busy || !bounds}
        fullWidth
      />
      <Button
        label={t.exportFile}
        variant="ghost"
        onClick={() => void run('json')}
        disabled={busy}
        fullWidth
      />
    </div>
  );
}
