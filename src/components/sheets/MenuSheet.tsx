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
  onNew,
  onOpenBoards,
  onOpenJoin,
  onOpenImport,
  onOpenPrivacy,
  onOpenPeople,
  onOpenAi,
}: {
  open: boolean;
  onClose: () => void;
  onNew: () => void;
  onOpenBoards: () => void;
  onOpenJoin: () => void;
  onOpenImport: () => void;
  onOpenPrivacy: () => void;
  onOpenPeople: () => void;
  onOpenAi: () => void;
}) {
  const t = useT();
  const canEdit = useBoardStore((s) => s.canEditNow());
  const name = useBoardStore((s) => s.meta?.name);

  const rows: { icon: IconName; label: string; onClick: () => void }[] = [
      { icon: 'plus', label: t.newWhiteboard, onClick: onNew },
      { icon: 'board', label: t.myWhiteboards, onClick: onOpenBoards },
      { icon: 'link', label: t.joinWhiteboard, onClick: onOpenJoin },
      { icon: 'download', label: t.importBoard, onClick: onOpenImport },
      { icon: 'lock', label: t.whoEdits, onClick: onOpenPrivacy },
      { icon: 'people', label: t.sheetPeople, onClick: onOpenPeople },
      ...(canEdit ? [{ icon: 'sparkle' as const, label: t.sheetAi, onClick: onOpenAi }] : []),
  ];

  return (
    <Sheet open={open} title={t.boardMenu} onClose={onClose} closeLabel={t.close}>
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
