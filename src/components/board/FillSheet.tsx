/**
 * A shape's fill, as the two things it is: a colour (typed as HEX or picked)
 * and an opacity. Every change applies at once, so the shape — or the next one
 * drawn — is the preview; 0% is no fill at all.
 */
import { useState } from 'react';

import { useT } from '../../features/i18n';
import { Css, DrawingPalette, parseHex } from '../../lib/theme';
import { Field } from '../ui/Field';
import { Sheet } from '../ui/Sheet';

const PRESETS = [0, 25, 50, 75, 100];

export function FillSheet({
  open,
  color,
  custom,
  opacity,
  onColor,
  onOpacity,
  onClose,
}: {
  open: boolean;
  /** The colour in effect, shown as the HEX field's value. */
  color: string;
  /** Whether it was chosen, rather than following the line. */
  custom: boolean;
  opacity: number;
  /** null: follow the line's colour. */
  onColor: (color: string | null) => void;
  onOpacity: (opacity: number) => void;
  onClose: () => void;
}) {
  const t = useT();
  // What is being typed, until the colour changes some other way (a swatch,
  // another shape selected): then the field shows what is now true.
  const [typed, setTyped] = useState<{ for: string; text: string } | null>(null);
  const text = typed && typed.for === color ? typed.text : color;
  const valid = parseHex(text) !== null;

  return (
    <Sheet open={open} title={t.fill} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-[26px] h-11 w-11 flex-none rounded-lg border-[1.5px]"
            style={{ borderColor: Css.border, background: `${color}${Math.round((opacity * 255) / 100).toString(16).padStart(2, '0')}` }}
          />
          <Field
            mono
            label={t.hexCode}
            value={text}
            maxLength={7}
            spellCheck={false}
            autoCapitalize="characters"
            error={valid ? null : t.hexInvalid}
            onChange={(e) => {
              const hex = parseHex(e.target.value);
              // A valid colour is the new value, so what is typed is for that.
              setTyped({ for: hex ?? color, text: e.target.value });
              if (hex) onColor(hex);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DrawingPalette.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`${t.fillColor} ${swatch}`}
              aria-pressed={custom && color.toUpperCase() === swatch.toUpperCase()}
              onClick={() => onColor(swatch)}
              className="h-8 w-8 rounded-lg border-2 transition hover:scale-110"
              style={{
                background: swatch,
                borderColor: custom && color.toUpperCase() === swatch.toUpperCase() ? Css.accent : Css.background,
              }}
            />
          ))}
          <button
            type="button"
            aria-pressed={!custom}
            onClick={() => onColor(null)}
            className={`h-8 rounded-lg border px-2.5 text-[0.75rem] font-bold transition hover:bg-surface-selected ${
              custom ? 'border-line-dashed text-text-secondary' : 'border-accent text-accent-text'
            }`}
          >
            {t.sameAsLine}
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="flex justify-between text-[0.75rem] font-extrabold tracking-[0.9px] text-text-secondary uppercase">
            {t.opacity}
            <span className="font-mono text-text">{opacity}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacity}
            onChange={(e) => onOpacity(Number(e.target.value))}
            aria-label={t.opacity}
            className="w-full accent-[var(--color-accent)]"
          />
        </label>
        <div className="flex gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={opacity === p}
              onClick={() => onOpacity(p)}
              className={`h-8 flex-1 rounded-lg text-[0.75rem] font-bold transition ${
                opacity === p ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-selected'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
