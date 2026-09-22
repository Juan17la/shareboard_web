/**
 * Design tokens for imperative code — the canvas renderer, gesture math,
 * anything that cannot use a class name. Mirrors `src/index.css`, which mirrors
 * the mobile app's `src/constants/theme.ts`. Rationale in mobile/docs/03-styles.
 */

export type Theme = 'light' | 'dark';

/** The light palette, as literals: the fallback when there is no DOM (node checks). */
const Light = {
  background: '#FFFFFF',
  surface: '#F2F2F7',
  surfaceSelected: '#E5E5EA',
  text: '#000000',
  textSecondary: '#6C6C70',
  textTertiary: '#8E8E93',

  /** The single brand accent: active tool, primary CTA, selected state. */
  accent: '#7A1F2B',
  accentDeep: '#5A1420',
  accentSoft: 'rgba(122,31,43,0.11)',
  accentSofter: 'rgba(122,31,43,0.07)',

  danger: '#D70015',
  dangerBright: '#FF3B30',
  dangerSoft: 'rgba(255,59,48,0.08)',
  warn: '#C93400',
  warnSoft: 'rgba(255,149,0,0.12)',

  glass: 'rgba(255,255,255,0.46)',
  glassSolid: 'rgba(255,255,255,0.62)',
  border: 'rgba(60,60,67,0.10)',
  borderStrong: 'rgba(60,60,67,0.14)',
  borderDashed: 'rgba(60,60,67,0.22)',
};

/** The CSS variable behind each token; the key itself, kebab-cased, unless named here. */
const VAR: Partial<Record<keyof typeof Light, string>> = {
  border: 'line',
  borderStrong: 'line-strong',
  borderDashed: 'line-dashed',
};

// The theme lives in CSS (`index.css`), so the imperative side reads it back
// from the computed variables instead of keeping a second palette. Reads are
// cached until <html data-theme> changes: the renderer asks several times a
// frame and `getComputedStyle` is not free.
let cache: Partial<Record<string, string>> = {};
let cachedTheme: string | undefined;

/**
 * UI surfaces, live: `Colors.accent` is whatever the current theme paints.
 * Deliberately restrained: board content is the star.
 */
export const Colors: Readonly<typeof Light> = new Proxy(Light, {
  get(light, key: keyof typeof Light) {
    if (typeof document === 'undefined') return light[key];
    const theme = document.documentElement.dataset.theme;
    if (theme !== cachedTheme) {
      cache = {};
      cachedTheme = theme;
    }
    return (cache[key] ??=
      getComputedStyle(document.documentElement)
        .getPropertyValue(`--color-${VAR[key] ?? key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`)
        .trim() || light[key]);
  },
});

/** Whether the dark board is on — what `inkFor` and the canvas background follow. */
export const isDark = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';

/**
 * The default ink (and picked black) is dark and vanishes on the dark
 * board, so the renderer paints it as the dark text colour instead. Only the
 * painting changes: the element keeps its colour, and a collaborator on the
 * light theme sees ink. Any fill alpha suffix is kept.
 */
export function inkFor(color: string, dark: boolean): string {
  return dark && /^#(1B2030|000000)/i.test(color) ? '#FFFFFF' + color.slice(7) : color;
}

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
  '#7A1F2B',
  '#E5484D',
  '#F76808',
  '#30A46C',
  '#0091FF',
  '#8E4EC6',
] as const;

/** Presence icons to pick from on the identity screen; each carries its own colour. */
export const Avatars = [
  { icon: '🦊', color: '#F76808' },
  { icon: '🐼', color: '#1B2030' },
  { icon: '🐸', color: '#30A46C' },
  { icon: '🐙', color: '#8E4EC6' },
  { icon: '🦄', color: '#E93D82' },
  { icon: '🐝', color: '#F5B301' },
  { icon: '🦋', color: '#208AEF' },
  { icon: '🐢', color: '#3E9B4F' },
  { icon: '🐬', color: '#0EA5E9' },
  { icon: '🦉', color: '#8B5E3C' },
  { icon: '🐨', color: '#6B7280' },
  { icon: '🐯', color: '#E5484D' },
  { icon: '🦁', color: '#D97706' },
  { icon: '🐧', color: '#1E3A8A' },
  { icon: '🦕', color: '#0F766E' },
  { icon: '🚀', color: '#7C3AED' },
] as const;

/** The colour an icon carries; the first icon's when unknown. */
export const avatarColor = (icon: string): string =>
  (Avatars.find((a) => a.icon === icon) ?? Avatars[0]).color;

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
export type FillLevel = 'none' | 'low' | 'medium' | 'full';

/** A fill is the stroke colour at one of three alphas: a wash (~18%), a half, or solid. */
export const FILL_ALPHA: Record<Exclude<FillLevel, 'none'>, string> = { low: '2E', medium: '80', full: 'FF' };

/** `#RRGGBB` -> the `#RRGGBBAA` a fill is painted with, or null for no fill. */
export const fillFor = (color: string, level: FillLevel): string | null =>
  level === 'none' ? null : color.slice(0, 7) + FILL_ALPHA[level];

/** The level a painted fill was made with — what the toolbar highlights. */
export function fillLevelOf(fill: string | null | undefined): FillLevel {
  if (!fill) return 'none';
  const a = fill.slice(7).toUpperCase();
  return a === FILL_ALPHA.low ? 'low' : a === FILL_ALPHA.medium ? 'medium' : 'full';
}
