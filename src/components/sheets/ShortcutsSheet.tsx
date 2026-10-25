/**
 * "Keyboard shortcuts": the list `?` opens. Settings shows the same list
 * (`ShortcutList`), so the keys are written down in one place.
 */
import { useT } from '../../features/i18n';

import { GlassPanel } from '../ui/Glass';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';

/** `heading`: the panel's own title, left out where the sheet's title already says it. */
export function ShortcutList({ heading = true }: { heading?: boolean }) {
  const t = useT();
  return (
    <GlassPanel level="row" radius={15}>
      <div className="flex items-start gap-2.5 p-3.5">
        <span className="mt-0.5 text-text-secondary">
          <Icon name="keyboard" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          {heading ? <div className="text-[0.8125rem] leading-tight font-bold">{t.shortcuts}</div> : null}
          <div className={`flex flex-col gap-1.5 ${heading ? 'mt-2' : ''}`}>
            {[
              [t.shortcutsTools, t.shortcutsToolsKeys],
              [t.shortcutsEdit, t.shortcutsEditKeys],
              [t.shortcutsView, t.shortcutsViewKeys],
            ].map(([label, keys]) => (
              <div key={label}>
                <div className="text-[0.75rem] font-bold text-text-tertiary uppercase">{label}</div>
                <div className="text-[0.75rem] leading-relaxed text-text-secondary">{keys}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Sheet open={open} title={t.shortcuts} onClose={onClose} closeLabel={t.close}>
      <ShortcutList heading={false} />
    </Sheet>
  );
}
