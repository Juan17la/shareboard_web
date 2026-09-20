/**
 * "Board": the overflow menu behind the header's ⋯ button.
 *
 * Everything here is reachable some other way too — export from the share
 * sheet, access from the header chip — because the design puts the frequent
 * routes on the surface and keeps this as the complete list for anyone who did
 * not find them.
 */
import { useT } from '../../features/i18n';
import { Colors } from '../../lib/theme';

import { GlassPanel } from '../ui/Glass';
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
}: {
  open: boolean;
  onClose: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenPrivacy: () => void;
  onOpenPeople: () => void;
  onOpenSettings: () => void;
}) {
  const t = useT();

  const rows: { icon: IconName; label: string; onClick: () => void }[] = [
    { icon: 'image', label: t.exportImage, onClick: onOpenExport },
    { icon: 'download', label: t.importBoard, onClick: onOpenImport },
    { icon: 'lock', label: t.whoEdits, onClick: onOpenPrivacy },
    { icon: 'people', label: t.sheetPeople, onClick: onOpenPeople },
    { icon: 'settings', label: t.sheetSettings, onClick: onOpenSettings },
  ];

  return (
    <Sheet open={open} title={t.sheetMenu} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <GlassPanel key={row.label} level="row" radius={15}>
            <button
              type="button"
              aria-label={row.label}
              onClick={row.onClick}
              className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-surface-selected"
            >
              <span
                className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] text-accent"
                style={{ background: Colors.accentSoft }}
              >
                <Icon name={row.icon} size={19} />
              </span>
              <span className="flex-1 text-[13.5px] leading-tight font-bold">{row.label}</span>
              <span className="text-text-tertiary">
                <Icon name="chevron" size={15} />
              </span>
            </button>
          </GlassPanel>
        ))}
      </div>
    </Sheet>
  );
}
