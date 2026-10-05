/**
 * One box with a colour in it: what the options strip shows instead of a row of
 * palette swatches. The box is the colour at its own opacity over a
 * checkerboard (so "transparent" reads as transparent), ringed so white shows
 * up on a white strip; the sheet it opens keeps the palette and the HEX field.
 */
import { Css } from '../../lib/theme';

export function ColorSwatch({
  color,
  label,
  caption,
  active = false,
  onClick,
}: {
  /** Any CSS colour, alpha included. */
  color: string;
  label: string;
  /** Small text beside the box ("Border", "Background 50%"). */
  caption?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-tip={label}
      onClick={onClick}
      className="touch-36 flex h-8 items-center gap-1.5 rounded-[9px] border px-1.5 transition hover:bg-surface-selected"
      style={{ borderColor: active ? Css.accent : Css.borderStrong, background: Css.surface }}
    >
      <span
        className="relative block h-5 w-5 flex-none overflow-hidden rounded-md"
        style={{
          boxShadow: `0 0 0 1.5px ${Css.borderStrong}`,
          background: 'repeating-conic-gradient(#c7cbd4 0% 25%, #fff 0% 50%) 0 0 / 8px 8px',
        }}
      >
        <span className="absolute inset-0" style={{ background: color }} />
      </span>
      {caption ? <span className="text-[0.75rem] font-bold">{caption}</span> : null}
    </button>
  );
}
