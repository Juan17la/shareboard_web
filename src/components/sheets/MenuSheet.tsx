/**
 * "Menu": the way between whiteboards and the rest of what a board can do —
 * a new one, one of your old ones, one joined with a code, a file brought in —
 * then export, who may edit, who is here, the assistant.
 *
 * There is no home page to go back to: the app opens on the last whiteboard,
 * and this is where the others are reached from. The settings are their own
 * button on the header.
 */
import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';

import { Icon, type IconName } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';

export function MenuSheet({
  open,
  onClose,
  onOpenBoards,
  onOpenImport,
  onOpenPrivacy,
  onOpenPeople,
  onOpenAi,
}: {
  open: boolean;
  onClose: () => void;
  onOpenBoards: () => void;
  onOpenImport: () => void;
  onOpenPrivacy: () => void;
  onOpenPeople: () => void;
  onOpenAi: () => void;
}) {
  const t = useT();
  const canEdit = useBoardStore((s) => s.canEditNow());
  const name = useBoardStore((s) => s.meta?.name);
  const local = useBoardStore((s) => s.connection === 'local');

  const rows: { icon: IconName; label: string; onClick: () => void }[] = [
      { icon: 'board', label: t.myWhiteboards, onClick: onOpenBoards },
      { icon: 'download', label: t.importBoard, onClick: onOpenImport },
      // The offline board has nobody else on it and no access to set.
      ...(local
        ? []
        : [
            { icon: 'lock' as const, label: t.whoEdits, onClick: onOpenPrivacy },
            { icon: 'people' as const, label: t.sheetPeople, onClick: onOpenPeople },
          ]),
      ...(canEdit ? [{ icon: 'sparkle' as const, label: t.sheetAi, onClick: onOpenAi }] : []),
  ];

  return (
    <Sheet open={open} title={t.boardMenu} onClose={onClose} closeLabel={t.close}>
      {/* A long board name is cut short in the header; here it is whole. */}
      {name ? <p className="mb-2 px-3 text-[0.75rem] font-semibold break-words text-text-secondary">{name}</p> : null}
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={row.onClick}
            className="flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-left transition hover:bg-text/[0.08] active:bg-text/[0.12]"
          >
            <Icon name={row.icon} size={18} />
            <span className="flex-1 text-[0.875rem] leading-tight font-semibold">{row.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
