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
import { toSvg } from '../../lib/svg';
import { inked, paintBoard } from '../board/renderer';

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
    <Sheet open={open} title={t.sheetExport} onClose={onClose} closeLabel={t.close} wide>
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
  const selectedIds = useBoardStore((s) => s.selectedIds);

  const [format, setFormat] = useState<ImageFormat | 'svg'>('png');
  const [transparentOn, setTransparent] = useState(false);
  const [tone, setTone] = useState<'light' | 'dark'>('light');
  const [busy, setBusy] = useState<null | 'download' | 'copy' | 'json'>(null);
  // With something selected (the cursor's pick, groups included), that is
  // what is exported unless the whole board is asked for.
  const [scope, setScope] = useState<'all' | 'selection'>(selectedIds.length ? 'selection' : 'all');
  const previewRef = useRef<HTMLCanvasElement>(null);

  const list = useMemo(() => {
    const all = visibleSorted(elements);
    if (scope === 'all') return all;
    const ids = new Set(selectedIds);
    return all.filter((el) => ids.has(el.id));
  }, [elements, scope, selectedIds]);
  const bounds = useMemo(() => contentBounds(list), [list]);
  const size = useMemo(() => exportSize(list), [list]);

  // A JPEG has no alpha channel, so the toggle is ignored (and hidden) for it.
  const transparent = transparentOn && format !== 'jpg';
  const paintBackground = !transparent;
  const ground = tone === 'dark' ? '#1C1C1E' : '#FFFFFF';
  // Default ink is dark and would vanish on the dark ground: paint it light, as
  // the dark board does. The snapshot keeps the real colours.
  const drawn = useMemo(
    () => (paintBackground && tone === 'dark' ? list.map(inked) : list),
    [list, paintBackground, tone],
  );

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
      elements: drawn,
      camera: { x: (PADDING - bounds.x) * scale, y: (PADDING - bounds.y) * scale, scale },
      width,
      height,
      smooth: true,
      grid: false,
      background: paintBackground ? ground : null,
      onImageReady: () => {},
    });
  }, [drawn, bounds, paintBackground, ground]);

  async function run(action: 'download' | 'copy' | 'json') {
    if (!meta) return;
    setBusy(action);
    try {
      // What is exported is what the file carries back: only the selection's
      // elements when only the selection is exported.
      const snapshot = toSnapshot(meta.name, Object.fromEntries(list.map((el) => [el.id, el])));
      if (action === 'json') {
        downloadSnapshot(snapshot);
        toast(t.toastExport);
        onClose();
        return;
      }

      if (format === 'svg') {
        const svg = toSvg(drawn, { background: paintBackground ? ground : null });
        if (!svg) throw new Error(t.previewEmpty);
        downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), fileNameFor(meta.name, 'svg'));
        toast(t.toastExport);
        onClose();
        return;
      }

      const rendered = await renderBoardImage({
        elements: drawn,
        snapshot,
        format,
        transparent,
        background: ground,
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
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-5">
      {/* Left: what is being exported. */}
      <div className="flex min-w-0 flex-col gap-2 sm:w-[300px] sm:flex-none">
        <div
          className="relative grid min-h-[140px] flex-1 place-items-center overflow-hidden rounded-lg border border-line bg-surface p-3"
          style={
            paintBackground
              ? undefined
              : {
                  backgroundColor: '#FFFFFF',
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
            <span className="font-mono text-[0.75rem] text-text-tertiary">{t.previewEmpty}</span>
          )}
          {busy ? (
            <div className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-[1px]">
              <div className="h-6 w-6 animate-spin rounded-full border-[2.5px] border-accent border-t-transparent" />
            </div>
          ) : null}
        </div>

        {size ? (
          <p className="text-center font-mono text-[0.75rem] text-text-secondary">
            {tf('exportSize', { W: size.width, H: size.height, N: list.length })}
          </p>
        ) : null}
      </div>

      {/* Right: how, in the order it is decided — scope, format, background, go. */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {selectedIds.length ? (
          <Segmented
            label={t.exportScope}
            value={scope}
            onChange={setScope}
            disabled={busy !== null}
            options={[
              { value: 'all' as const, label: t.exportAll },
              { value: 'selection' as const, label: t.exportSelection },
            ]}
          />
        ) : null}

        <Segmented
          label={t.sheetExport}
          value={format}
          onChange={setFormat}
          disabled={busy !== null}
          options={[
            { value: 'png' as const, label: 'PNG' },
            { value: 'svg' as const, label: 'SVG' },
            { value: 'jpg' as const, label: 'JPG' },
          ]}
        />

        {/* A JPEG has no alpha channel, so the option only exists where it can hold. */}
        {format !== 'jpg' ? (
          <SheetRow
            title={t.transparentBg}
            right={<Toggle value={transparent} onChange={setTransparent} label={t.transparentBg} />}
          />
        ) : null}

        {paintBackground ? (
          <Segmented
            label={t.transparentBg}
            value={tone}
            onChange={setTone}
            disabled={busy !== null}
            options={[
              { value: 'light' as const, label: t.exportLight },
              { value: 'dark' as const, label: t.exportDark },
            ]}
          />
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Button
            label={t.download}
            icon="download"
            compact
            onClick={() => void run('download')}
            loading={busy === 'download'}
            disabled={!bounds || busy !== null}
            fullWidth
          />
          <Button
            label={t.copyImage}
            icon="copy"
            variant="secondary"
            compact
            onClick={() => void run('copy')}
            loading={busy === 'copy'}
            disabled={!bounds || busy !== null || format === 'svg'}
            fullWidth
          />
          <Button
            label={t.exportFile}
            icon="json"
            variant="secondary"
            compact
            onClick={() => void run('json')}
            loading={busy === 'json'}
            disabled={busy !== null}
            fullWidth
          />
        </div>
      </div>
    </div>
  );
}
