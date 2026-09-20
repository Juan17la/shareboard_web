/**
 * The frosted panel every floating surface in this app is built from.
 *
 * The mobile app assembles this from a BlurView plus a tint, a hairline and a
 * top highlight; a browser gets the whole recipe from `backdrop-filter`, so the
 * three levels here are just CSS classes (see `.glass*` in `index.css`). The
 * levels differ in opacity so text keeps its contrast: `panel` is the tool rail
 * and the sheets, `row` is a list row, `chip` is a floating pill.
 */
import type { CSSProperties, ReactNode } from 'react';

export type GlassLevel = 'panel' | 'row' | 'chip';

const LEVEL: Record<GlassLevel, string> = {
  panel: 'glass',
  row: 'glass-row',
  chip: 'glass-chip',
};

export function GlassPanel({
  children,
  level = 'panel',
  radius = 20,
  border = 'var(--color-line)',
  overflow = 'hidden',
  className = '',
  style,
}: {
  children?: ReactNode;
  level?: GlassLevel;
  radius?: number;
  /** Hairline border. Pass `null` for a borderless panel. */
  border?: string | null;
  /** Clipping keeps children inside the rounded corners; a panel whose
   *  buttons show tooltips outside it asks for `visible`. */
  overflow?: 'hidden' | 'visible';
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`${LEVEL[level]} overflow-${overflow} ${className}`}
      style={{
        borderRadius: radius,
        ...(border ? { border: `1px solid ${border}` } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
