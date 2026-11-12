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
import { useNavigate } from 'react-router-dom';

import { useT } from '../../../features/i18n';
import { useBoardStore } from '../../../features/board-store';

import { Icon, type IconName } from '../../atoms/Icon';
import { RowChevron, Sheet, SheetGroup, SheetRow } from '../../molecules/Sheet';

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
  const navigate = useNavigate();
  const canEdit = useBoardStore((s) => s.canEditNow());
  const name = useBoardStore((s) => s.meta?.name);
  const local = useBoardStore((s) => s.connection === 'local');

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: t.menuBoards,
      rows: [
        { icon: 'board', label: t.myWhiteboards, onClick: onOpenBoards },
        { icon: 'plus', label: t.createOrJoin, onClick: onOpenNew },
        { icon: 'download', label: t.importBoard, onClick: onOpenImport },
      ],
    },
    {
      title: t.menuThisBoard,
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
      rows: [
        { icon: 'settings', label: t.sheetSettings, onClick: onOpenSettings },
        // A phone has no keyboard to press them on.
        ...(matchMedia('(any-pointer: fine)').matches
          ? [{ icon: 'keyboard' as const, label: t.shortcuts, onClick: onOpenShortcuts }]
          : []),
        // The public page: what Shareboard is, its source, the terms.
        { icon: 'link', label: t.aboutShareboard, onClick: () => navigate('/about') },
      ],
    },
  ];

  return (
    <Sheet open={open} title={t.boardMenu} onClose={onClose} closeLabel={t.close}>
      {/* A long board name is cut short in the header; here it is whole. */}
      {name ? <p className="-mt-1 mb-3 px-3 text-center text-[0.8125rem] break-words text-text-secondary">{name}</p> : null}
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <SheetGroup key={group.title} title={group.title}>
            {group.rows.map((row) => (
              <SheetRow
                key={row.label}
                title={row.label}
                left={<Icon name={row.icon} size={19} className="flex-none text-accent-text" />}
                right={<RowChevron />}
                onClick={row.onClick}
              />
            ))}
          </SheetGroup>
        ))}
      </div>
    </Sheet>
  );
}
