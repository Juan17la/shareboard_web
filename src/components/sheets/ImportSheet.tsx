/**
 * "Import": open a file back into a board.
 *
 * One button, one switch, three outcomes — see `features/import.ts` for how the
 * file's actual bytes decide which. A restored board is always a *new* board
 * rather than a paste into this one, so importing can never overwrite something
 * other people are working on; a plain picture is placed on the current board
 * as a single element.
 *
 * The sheet is used from the home page too, where there is no board to place a
 * picture on — `allowImagePlacement` is what tells the two apart.
 *
 * The file button is also a drop target, which is the one thing a browser can
 * offer that a phone cannot: dragging a `.json` onto the panel is faster than
 * any picker.
 */
import { useRef, useState } from 'react';

import { useT } from '../../features/i18n';
import {
  IMAGE_ACCEPT,
  IMPORT_ACCEPT,
  placementSize,
  readBoardFile,
  shrinkToElement,
} from '../../features/import';
import { useBoardStore } from '../../features/board-store';
import type { BoardSnapshot } from '../../lib/contract';

import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Sheet, SheetRow } from '../ui/Sheet';
import { Toggle } from '../ui/Toggle';
import { toast } from '../../lib/toast';

export function ImportSheet({
  open,
  onClose,
  onImportSnapshot,
  allowImagePlacement,
}: {
  open: boolean;
  onClose: () => void;
  /** Given a parsed snapshot, create the board and navigate to it. */
  onImportSnapshot: (snapshot: BoardSnapshot) => Promise<void>;
  allowImagePlacement: boolean;
}) {
  const t = useT();
  const addImage = useBoardStore((s) => s.addImage);
  const canEdit = useBoardStore((s) => s.canEditNow());

  const [editable, setEditable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  const placeImage = (uri: string, width: number, height: number) => {
    const size = placementSize(width, height);
    addImage({ x: 40, y: 40 }, size.width, size.height, uri);
  };

  async function handleBoardFile(file: File) {
    setBusy(true);
    try {
      const result = await readBoardFile(file, editable);

      if (result.kind === 'snapshot') {
        await onImportSnapshot(result.snapshot);
        toast(t.toastImport);
        onClose();
        return;
      }

      if (!allowImagePlacement || !canEdit) {
        toast(t.toastNoEdit);
        return;
      }
      placeImage(result.uri, result.width, result.height);
      toast(t.toastImportImage);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : t.errImport);
    } finally {
      setBusy(false);
    }
  }

  async function handleImageFile(file: File) {
    setBusy(true);
    try {
      const result = await shrinkToElement(file);
      placeImage(result.uri, result.width, result.height);
      toast(t.toastImportImage);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : t.errImport);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} title={t.sheetImport} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-3">
        <input
          ref={fileInput}
          type="file"
          accept={IMPORT_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset first: picking the same file twice must fire `change` again.
            e.target.value = '';
            if (file) void handleBoardFile(file);
          }}
        />
        <input
          ref={imageInput}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleImageFile(file);
          }}
        />

        <button
          type="button"
          aria-label={t.pickFile}
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleBoardFile(file);
          }}
          className={`flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 transition ${
            dragging
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-line-dashed text-text/60 hover:bg-white/60 hover:text-text'
          } ${busy ? 'opacity-55' : ''}`}
        >
          <Icon name="download" size={22} />
          <span className="text-[14px] font-extrabold">{t.pickFile}</span>
          <span className="text-[11.5px] font-semibold">{t.dropHint}</span>
        </button>

        <p className="text-center text-[11.5px] leading-snug text-text-secondary">
          {t.importHint}
        </p>

        <SheetRow
          title={t.importEditable}
          description={t.importEditableHint}
          right={<Toggle value={editable} onChange={setEditable} label={t.importEditable} />}
        />

        {allowImagePlacement ? (
          <Button
            label={t.addImage}
            icon="image"
            variant="secondary"
            onClick={() => imageInput.current?.click()}
            disabled={busy || !canEdit}
            fullWidth
          />
        ) : null}
      </div>
    </Sheet>
  );
}
