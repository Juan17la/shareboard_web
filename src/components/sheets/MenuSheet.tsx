/**
 * "Menu": everything a board offers that is not on the board itself, in three
 * labelled groups — the whiteboards (this one's siblings, a new one, a file
 * brought in), what can be done with this board (export, who may edit, who is
 * here, the assistant), and the app (settings, and the keyboard shortcuts
 * where there is a mouse).
 *
 * There is no home page to go back to: the app opens on the last whiteboard,
 * and this is where the others are reached from. Each thing has exactly one
 * entry here; the header carries only Share.
 */
import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';

import { Icon, type IconName } from '../ui/Icon';
import { LineColor, type Line } from '../../lib/theme';
import { SectionLabel, Sheet } from '../ui/Sheet';

type Row = { icon: IconName; label: string; onClick: () => void };

export function MenuSheet({
  open,
  onClose,
  onOpenBoards,
  onOpenNew,
  onOpenImport,
  onOpenExport,
  onOpenPrivacy,
  onOpenPeople,
  onOpenAi,
  onOpenTemplates,
  onOpenSettings,
  onOpenShortcuts,
}: {
  open: boolean;
  onClose: () => void;
  onOpenBoards: () => void;
  onOpenNew: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenPrivacy: () => void;
  onOpenPeople: () => void;
  onOpenAi: () => void;
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}) {
  const t = useT();
  const canEdit = useBoardStore((s) => s.canEditNow());
  const name = useBoardStore((s) => s.meta?.name);
  const local = useBoardStore((s) => s.connection === 'local');

  const groups: { title: string; line: Line; rows: Row[] }[] = [
    {
      title: t.menuBoards,
      line: 'blue',
      rows: [
        { icon: 'board', label: t.myWhiteboards, onClick: onOpenBoards },
        { icon: 'plus', label: t.createOrJoin, onClick: onOpenNew },
        { icon: 'download', label: t.importBoard, onClick: onOpenImport },
      ],
    },
    {
      title: t.menuThisBoard,
      line: 'green',
      rows: [
        { icon: 'image', label: t.exportImage, onClick: onOpenExport },
        // The offline board has nobody else on it and no access to set.
        ...(local
          ? []
          : [
              { icon: 'lock' as const, label: t.whoEdits, onClick: onOpenPrivacy },
              { icon: 'people' as const, label: t.sheetPeople, onClick: onOpenPeople },
            ]),
        ...(canEdit
          ? [
              { icon: 'template' as const, label: t.templates, onClick: onOpenTemplates },
              { icon: 'sparkle' as const, label: t.sheetAi, onClick: onOpenAi },
            ]
          : []),
      ],
    },
    {
      title: t.menuApp,
      line: 'violet',
      rows: [
        { icon: 'settings', label: t.sheetSettings, onClick: onOpenSettings },
        // A phone has no keyboard to press them on.
        ...(matchMedia('(any-pointer: fine)').matches
          ? [{ icon: 'keyboard' as const, label: t.shortcuts, onClick: onOpenShortcuts }]
          : []),
      ],
    },
  ];

  return (
    <Sheet open={open} title={t.boardMenu} onClose={onClose} closeLabel={t.close}>
      {/* A long board name is cut short in the header; here it is whole. */}
      {name ? <p className="-mt-1 mb-3 text-[0.8125rem] font-medium break-words text-text-secondary">{name}</p> : null}
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <section key={group.title} aria-label={group.title} className="relative">
            <SectionLabel line={group.line}>{group.title}</SectionLabel>
            {/* The group's line runs down from its stop, past every row on it. */}
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-2 left-[4.5px] w-[3px] rounded-full"
              style={{ background: LineColor[group.line] }}
            />
            <div className="mt-1 flex flex-col pl-4">
              {group.rows.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={row.onClick}
                  className="touch-44 flex h-10 w-full items-center gap-3 rounded-[10px] px-2.5 text-left transition hover:bg-surface active:bg-surface-selected"
                >
                  <Icon name={row.icon} size={18} />
                  <span className="flex-1 text-[0.9375rem] leading-tight font-medium">{row.label}</span>
                  <Icon name="chevron" size={14} className="text-text-tertiary" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
