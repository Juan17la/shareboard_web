/**
 * Design tokens for imperative code — the canvas renderer, gesture math,
 * anything that cannot use a class name. Mirrors `src/index.css`, which mirrors
 * the mobile app's `tailwind.config.js`. Rationale in mobile/docs/03-styles.
 */

/** UI surfaces. Deliberately restrained: board content is the star. */
export const Colors = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  surfaceSelected: '#EEF0F6',
  text: '#1B2030',
  textSecondary: '#5A6170',
  textTertiary: '#8B909C',

  /** The single brand accent: active tool, primary CTA, selected state. */
  accent: '#6D3FB5',
  accentDeep: '#3C42AD',
  accentSoft: 'rgba(109,63,181,0.11)',
  accentSofter: 'rgba(109,63,181,0.07)',

  danger: '#C4353A',
  dangerBright: '#E5484D',
  dangerSoft: 'rgba(196,53,58,0.08)',
  warn: '#B4530A',
  warnSoft: 'rgba(247,104,8,0.12)',

  border: 'rgba(27,32,48,0.10)',
  borderStrong: 'rgba(27,32,48,0.14)',
  borderDashed: 'rgba(27,32,48,0.22)',
} as const;

/** Connection status badge colors (theme-independent). */
export const StatusColors = {
  online: '#0F9E8E',
  connecting: '#F59E0B',
  offline: '#9AA0A6',
} as const;

/**
 * Drawing color presets shown as swatches in the tool rail. Vivid on purpose —
 * this is board content, not UI chrome. "More" sits next to them.
 */
export const DrawingPalette = [
  '#1B2030', // ink
  '#E5484D', // red
  '#F76808', // orange
  '#FFB224', // amber
  '#30A46C', // green
  '#0091FF', // blue
  '#8E4EC6', // purple
  '#FF8FAB', // pink
] as const;

/** Stroke widths offered by the size picker. */
export const StrokeSizes = [2, 5, 10, 20] as const;

/** Identity colors offered on the nickname screen (also the presence color). */
export const NicknameColors = [
  '#6D3FB5',
  '#E5484D',
  '#F76808',
  '#30A46C',
  '#0091FF',
  '#8E4EC6',
] as const;

/** 4px base spacing scale. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 26, pill: 999 } as const;

/** Layout constants shared with the mobile app (mobile/docs/03-styles). */
export const Layout = {
  compactBreakpoint: 600,
  tabletBreakpoint: 900,
  minTouchTarget: 44,
} as const;

/** The dot grid's spacing in board units, and where it stops being drawn. */
export const GRID = { step: 26, minScreenStep: 9 } as const;

/** Zoom bounds. Matches the design's 25%–600% range. */
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 6;

/**
 * Fills are a tinted wash of the stroke colour rather than a solid block, so
 * the dot grid and anything underneath still read through them. `2E` is ~18%.
 */
export const FILL_ALPHA = '2E';

/** `#RRGGBB` -> the `#RRGGBBAA` a fill is painted with. */
export const fillFor = (color: string): string =>
  color.length === 9 ? color : color + FILL_ALPHA;
