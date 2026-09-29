/**
 * "Board": the overflow menu behind the header's ⋯ button.
 *
 * Everything here is reachable some other way too — export from the share
 * sheet, access from the header chip — because the design puts the frequent
 * routes on the surface and keeps this as the complete list for anyone who did
 * not find them.
 */
import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';

import { Icon, type IconName } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';

export function MenuSheet({
  open,
  onClose,
  onOpenExport,
  onOpenImport,
  onOpenPrivacy,
  onOpenPeople,
  onOpenSettings,
  onOpenAi,
}: {
  open: boolean;
  onClose: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenPrivacy: () => void;
  onOpenPeople: () => void;
  onOpenSettings: () => void;
  onOpenAi: () => void;
}) {
  const t = useT();
  const canEdit = useBoardStore((s) => s.canEditNow());
  const name = useBoardStore((s) => s.meta?.name);
  const coarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  const rows: { icon: IconName; label: string; onClick: () => void }[] = [
    { icon: 'image', label: t.exportImage, onClick: onOpenExport },
    { icon: 'download', label: t.importBoard, onClick: onOpenImport },
    { icon: 'lock', label: t.whoEdits, onClick: onOpenPrivacy },
    { icon: 'people', label: t.sheetPeople, onClick: onOpenPeople },
    { icon: 'settings', label: t.sheetSettings, onClick: onOpenSettings },
    // The shortcut list is in Settings; a touch screen has no keyboard to use it with.
    ...(coarsePointer ? [] : [{ icon: 'keyboard' as const, label: t.shortcuts, onClick: onOpenSettings }]),
    ...(canEdit ? [{ icon: 'sparkle' as const, label: t.sheetAi, onClick: onOpenAi }] : []),
  ];

  return (
    <Sheet open={open} title={t.sheetMenu} onClose={onClose} closeLabel={t.close}>
      {/* A long board name is cut short in the header; here it is whole. */}
      {name ? <p className="mb-1 px-2 text-[0.75rem] font-semibold break-words text-text-secondary">{name}</p> : null}
      <div className="flex flex-col divide-y divide-line-strong">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={row.onClick}
            className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-text/[0.12] active:bg-text/[0.16]"
          >
            <Icon name={row.icon} size={19} />
            <span className="flex-1 text-[0.875rem] leading-tight font-semibold">{row.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
