/**
 * "Templates": a ready-made start for a class activity, added in the middle of
 * the screen as one undo step (`features/templates.ts`).
 */
import { useT } from '../../features/i18n';
import { screenToBoard, useBoardStore } from '../../features/board-store';
import { TEMPLATES, templateElements, templateSpot } from '../../features/templates';

import { Icon } from '../ui/Icon';
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
  return (
    <Sheet open={open} title={t.templates} onClose={onClose} closeLabel={t.close}>
      <p className="mb-3 px-1 text-[0.8125rem] leading-snug text-text-secondary">{t.templatesHint}</p>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => add(key)}
            className="touch-44 flex h-14 items-center gap-2.5 rounded-[12px] border border-line px-3 text-left text-[0.875rem] font-bold transition hover:bg-text/[0.08] active:bg-text/[0.12]"
          >
            <Icon name="template" size={18} />
            {t[label]}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
