/**
 * "Keyboard shortcuts": the list `?` opens, also reached from Settings.
 *
 * One row per action, the keys drawn as keycaps on the right, grouped on the
 * same lines as the menu. The modifier is the one this keyboard has: ⌘ on a
 * Mac, Ctrl elsewhere. The bindings themselves live in `hooks/use-shortcuts.ts`
 * and the tool keys in `board/Toolbar.tsx`; keep this list in step with both.
 */
import { Fragment } from 'react';

import { useT } from '../../features/i18n';
import type { Strings } from '../../features/strings';
import { type Line } from '../../lib/theme';

import { SectionLabel, Sheet } from '../ui/Sheet';

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Keys pressed together; an entry lists one or more alternatives. */
type Combo = string[];
type Entry = { label: string; combos: Combo[] };
type Group = { title: string; line: Line; entries: Entry[] };

function groups(t: Strings): Group[] {
  const mod = MAC ? '⌘' : 'Ctrl';
  const shift = MAC ? '⇧' : t.kbShift;
  const key = (k: string): Combo[] => [[k]];
  return [
    {
      title: t.shortcutsTools,
      line: 'blue',
      entries: [
        { label: t.select, combos: key('V') },
        { label: t.hand, combos: key('H') },
        { label: t.pencil, combos: key('P') },
        { label: t.eraser, combos: key('E') },
        { label: t.shapes, combos: key('S') },
        { label: t.shapeRectangle, combos: key('R') },
        { label: t.shapeEllipse, combos: key('O') },
        { label: t.shapeTriangle, combos: key('Y') },
        { label: t.shapePolygon, combos: key('G') },
        { label: t.shapeLine, combos: key('L') },
        { label: t.shapeArrow, combos: key('A') },
        { label: t.sticky, combos: key('N') },
        { label: t.text, combos: key('T') },
        { label: t.fill, combos: key('F') },
      ],
    },
    {
      title: t.shortcutsEdit,
      line: 'green',
      entries: [
        { label: t.undo, combos: [[mod, 'Z']] },
        { label: t.redo, combos: [[mod, 'Y'], [mod, shift, 'Z']] },
        { label: t.selectAll, combos: [[mod, 'A']] },
        { label: t.copy, combos: [[mod, 'C']] },
        { label: t.cut, combos: [[mod, 'X']] },
        { label: t.paste, combos: [[mod, 'V']] },
        { label: t.duplicate, combos: [[mod, 'D']] },
        { label: t.remove, combos: [[MAC ? '⌫' : 'Del']] },
        { label: t.kbDeselect, combos: key('Esc') },
        { label: t.kbNudge, combos: [['←', '↑', '→', '↓']] },
      ],
    },
    {
      title: t.shortcutsView,
      line: 'violet',
      entries: [
        { label: t.zoomIn, combos: [[mod, '+']] },
        { label: t.zoomOut, combos: [[mod, '−']] },
        { label: t.resetZoom, combos: [[mod, '0']] },
        { label: t.fitContent, combos: [[shift, '1']] },
        { label: t.kbPan, combos: [[t.kbSpace, t.kbDrag], [t.kbRightClick, t.kbDrag]] },
        { label: t.kbHelp, combos: key('?') },
      ],
    },
  ];
}

function Keycap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] border-[1.5px] border-line-strong bg-background px-1.5 font-sans text-[0.75rem] leading-none font-semibold text-text">
      {children}
    </kbd>
  );
}

export function ShortcutList() {
  const t = useT();
  return (
    <div className="gap-x-8 sm:columns-2">
      {groups(t).map((group) => (
        <section key={group.title} aria-label={group.title} className="mb-4 break-inside-avoid">
          <SectionLabel line={group.line}>{group.title}</SectionLabel>
          <dl className="mt-1.5">
            {group.entries.map((entry) => (
              <div
                key={entry.label}
                className="flex min-h-9 items-center justify-between gap-3 border-b border-line py-1 last:border-b-0"
              >
                <dt className="min-w-0 text-[0.875rem] text-text">{entry.label}</dt>
                <dd className="flex flex-none flex-wrap items-center justify-end gap-1">
                  {entry.combos.map((combo, i) => (
                    <Fragment key={i}>
                      {i > 0 ? <span className="px-0.5 text-[0.75rem] text-text-tertiary">{t.kbOr}</span> : null}
                      {combo.map((k) =>
                        k === t.kbDrag ? (
                          <span key={k} className="text-[0.75rem] text-text-secondary">
                            + {k}
                          </span>
                        ) : (
                          <Keycap key={k}>{k}</Keycap>
                        ),
                      )}
                    </Fragment>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet open={open} title={t.shortcuts} onClose={onClose} closeLabel={t.close} wide>
      <ShortcutList />
    </Sheet>
  );
}
