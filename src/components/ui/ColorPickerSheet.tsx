/**
 * The "More colours" picker behind the palette's dashed button.
 *
 * A browser has `<input type="color">`, which the design's own prototype used —
 * but it opens the OS colour dialog, which looks nothing like the app and asks
 * a nine-year-old to reason about saturation. So this is the mobile app's grid
 * instead: every column a hue, every row a lightness, plus a greyscale row.
 * Picking is one click and needs no dragging. The native input is still offered
 * at the bottom for anyone who wants an exact value.
 */
import { useT } from '../../features/i18n';
import { Colors } from '../../lib/theme';

import { Sheet } from './Sheet';

/** Evenly spaced hues, skewed slightly to give more room to warm colours. */
const HUES = [0, 20, 40, 60, 100, 150, 175, 195, 215, 250, 280, 320];
/** Lightness ramp, dark to light. Saturation eases off at the extremes so the
 *  darkest and lightest rows do not turn into muddy or washed-out bands. */
const RAMP = [
  { l: 26, s: 62 },
  { l: 40, s: 78 },
  { l: 52, s: 86 },
  { l: 66, s: 82 },
  { l: 80, s: 78 },
];

const GREYS = [
  '#000000',
  '#1B2030',
  '#3F4657',
  '#6B7280',
  '#9AA0A6',
  '#C7CBD4',
  '#E6E8EC',
  '#FFFFFF',
];

/** HSL -> `#RRGGBB`, so every swatch matches the model's colour pattern. */
function hsl(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const hex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function ColorPickerSheet({
  open,
  value,
  onPick,
  onClose,
}: {
  open: boolean;
  value: string;
  onPick: (color: string) => void;
  onClose: () => void;
}) {
  const t = useT();

  const swatch = (color: string, key: string) => {
    const active = color.toUpperCase() === value.toUpperCase();
    return (
      <button
        key={key}
        type="button"
        aria-label={color}
        aria-pressed={active}
        title={color}
        onClick={() => onPick(color)}
        className="aspect-square flex-1 rounded-lg transition hover:scale-110"
        style={{
          background: color,
          border: active ? `2.5px solid ${Colors.accent}` : `1px solid ${Colors.border}`,
        }}
      />
    );
  };

  return (
    <Sheet open={open} title={t.color} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-1.5">
        {RAMP.map((step, row) => (
          <div key={row} className="flex gap-1.5">
            {HUES.map((h) => swatch(hsl(h, step.s, step.l), `${h}-${row}`))}
          </div>
        ))}

        <div className="h-1.5" />
        <div className="text-[0.75rem] font-extrabold tracking-[0.9px] text-text-secondary uppercase">
          {t.custom}
        </div>
        <div className="flex gap-1.5">
          {GREYS.map((grey) => swatch(grey, grey))}
          {/* Keeps the last row the same cell size as the hue rows above. */}
          {Array.from({ length: HUES.length - GREYS.length }).map((_, i) => (
            <div key={`spacer-${i}`} className="aspect-square flex-1" />
          ))}
        </div>

        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-line-dashed py-3 text-[0.75rem] font-bold text-text/70 transition hover:bg-surface-selected">
          <input
            type="color"
            value={value.slice(0, 7)}
            onChange={(e) => onPick(e.target.value.toUpperCase())}
            className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
            aria-label={t.color}
          />
          <span className="font-mono">{value.slice(0, 7).toUpperCase()}</span>
        </label>
      </div>
    </Sheet>
  );
}
