/**
 * "Templates": a ready-made start for a class activity, added in the middle of
 * the screen as one undo step (`features/templates.ts`). Each card shows the
 * template itself, drawn by the SVG export, so you see what you are adding.
 */
import { useMemo } from 'react';

import { useT } from '../../features/i18n';
import { screenToBoard, useBoardStore } from '../../features/board-store';
import { TEMPLATES, templateElements, templateSpot } from '../../features/templates';

import { toSvg } from '../../lib/svg';
import { Sheet } from '../ui/Sheet';

export function TemplatesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const add = (key: (typeof TEMPLATES)[number]['key']) => {
    const s = useBoardStore.getState();
    const els = templateElements(key, t);
    const at = templateSpot(els, s.visibleElements(), screenToBoard(s.viewport.width / 2, s.viewport.height / 2));
    s.paste(at, els);
    // Wherever it landed, it is what the screen shows next.
    const { scale } = s.camera;
    s.setCamera({ scale, x: s.viewport.width / 2 - at.x * scale, y: s.viewport.height / 2 - at.y * scale });
    onClose();
  };
  // On paper, whatever the board's theme: the thumbnails are pictures of it.
  const previews = useMemo(
    () =>
      Object.fromEntries(
        TEMPLATES.map(({ key }) => {
          const svg = toSvg(templateElements(key, t), { padding: 24, background: '#FFFFFF' });
          return [key, svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''];
        }),
      ),
    [t],
  );
  return (
    <Sheet open={open} title={t.templates} onClose={onClose} closeLabel={t.close} wide>
      <p className="mb-3 text-[0.875rem] leading-snug text-text-secondary">{t.templatesHint}</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {TEMPLATES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => add(key)}
            className="group flex flex-col self-start overflow-hidden rounded-[12px] border border-line-strong text-left transition hover:border-accent focus-visible:border-accent"
          >
            <span className="relative block aspect-[4/3] w-full overflow-hidden border-b border-line bg-white">
              {previews[key] ? (
                <img src={previews[key]} alt="" className="absolute inset-0 h-full w-full object-contain p-2" draggable={false} />
              ) : null}
            </span>
            <span className="px-3 py-2 text-[0.875rem] font-semibold group-hover:text-accent-text">{t[label]}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
