/**
 * Design tokens for imperative code — the canvas renderer, gesture math,
 * anything that cannot use a class name. Mirrors `src/index.css`, which mirrors
 * the mobile app's `src/constants/theme.ts`. Rationale in mobile/docs/03-styles.
 */

export type Theme = 'light' | 'dark';

/** The light palette, as literals: the fallback when there is no DOM (node checks). */
const Light = {
  background: '#FFFFFF',
  surface: '#EEF1F5',
  surfaceSelected: '#E1E6ED',
  text: '#0F1B2D',
  textSecondary: '#4A566B',
  textTertiary: '#6B7689',

  /** The blue line: active tool, primary CTA, selected state. */
  accent: '#0072CE',
  accentDeep: '#005AA3',
  accentSoft: 'rgba(0,114,206,0.11)',
  accentSofter: 'rgba(0,114,206,0.06)',

  danger: '#C8102E',
  dangerBright: '#E5283C',
  dangerSoft: 'rgba(229,40,60,0.08)',
  warn: '#B45300',
  warnSoft: 'rgba(224,111,0,0.12)',

  glass: 'rgba(255,255,255,0.96)',
  glassSolid: '#FFFFFF',
  border: 'rgba(15,27,45,0.10)',
  borderStrong: 'rgba(15,27,45,0.16)',
  borderDashed: 'rgba(15,27,45,0.28)',
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

/**
 * The same tokens as CSS `var()`s, for JSX styles. `Colors` hands back the
 * value of the theme at render time, and a component that does not subscribe
 * to the theme keeps it after a switch (icons and borders stayed the old
 * colour); a `var()` is resolved by the browser, so it follows `data-theme`.
 * Canvas and other imperative painting keeps reading `Colors`.
 */
const cssVar = (key: string) => `var(--color-${VAR[key as keyof typeof Light] ?? key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())})`;
export const Css = Object.fromEntries(Object.keys(Light).map((k) => [k, cssVar(k)])) as {
  readonly [K in keyof typeof Light]: string;
};

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

/**
 * A fill that reads as light paper on the dark board: bright and mostly
 * opaque (an AI flowchart's white or yellow boxes). Its dark ink stays dark,
 * as on a sticky note, or the white label would vanish into it.
 */
export function isLightPaper(fill: string | null | undefined): boolean {
  if (!fill || (fill.length > 7 && parseInt(fill.slice(7, 9), 16) < 0x99)) return false;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fill.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/** The lines a section can sit on: each group of a menu owns one, on web and mobile alike. */
export type Line = 'blue' | 'green' | 'orange' | 'violet' | 'ink';
export const LineColor: Record<Line, string> = {
  blue: 'var(--color-accent)',
  green: 'var(--color-go)',
  orange: 'var(--color-line-orange)',
  violet: 'var(--color-line-violet)',
  ink: 'var(--color-text)',
};

/** Connection status badge colors (theme-independent). */
export const StatusColors = {
  online: '#00843D',
  connecting: '#E06F00',
  offline: '#8A94A4',
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

/** Sticky note papers: pale enough that the default ink reads on them, light or dark board. */
export const StickyColors = ['#FFE58A', '#FFC2D1', '#B8E2FF', '#C6F0C2', '#E3D3FF', '#FFD3A8'] as const;

/** The ink a sticky note is written in: always dark, since the paper is always light. */
export const STICKY_INK = '#1B2030';

/** Stroke widths offered by the size picker. */
export const StrokeSizes = [2, 5, 10, 20] as const;

/** Identity colors offered on the nickname screen (also the presence color). */
export const NicknameColors = [
  '#0071E3',
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

export const Radius = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 22, pill: 999 } as const;

/** Layout constants shared with the mobile app (mobile/docs/03-styles). */
export const Layout = {
  compactBreakpoint: 600,
  tabletBreakpoint: 900,
  minTouchTarget: 44,
} as const;

/** The dot grid's spacing in board units, and where it stops being drawn. */
export const GRID = { step: 26, minScreenStep: 9 } as const;

/** Zoom bounds: 10 %–2,000 %, wide enough to fit a big board on screen. */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 20;

/**
 * A fill is any `#RRGGBB` at any opacity, stored as `#RRGGBBAA` (the format
 * every fill was already in: the old Light/Medium/Solid levels are 18%, 50% and
 * 100%, so boards drawn with them read back as plain numbers).
 */
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** What someone typed -> `#RRGGBB`, or null when it is not a colour (`f80`, `#FF8800` and `ff8800` all work). */
export function parseHex(text: string): string | null {
  const m = HEX.exec(text.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return '#' + h.toUpperCase();
}

/** The `#RRGGBBAA` a fill is painted with, or null at 0% (no fill at all). */
export function fillWith(color: string, opacity: number): string | null {
  const pct = Math.min(100, Math.max(0, Math.round(opacity)));
  if (pct === 0) return null;
  return color.slice(0, 7).toUpperCase() + Math.round((pct * 255) / 100).toString(16).padStart(2, '0').toUpperCase();
}

/** The colour of a painted fill, or null when there is none. */
export const fillColorOf = (fill: string | null | undefined): string | null =>
  fill ? fill.slice(0, 7).toUpperCase() : null;

/** The opacity of a painted fill, 0 to 100: what the toolbar shows. */
export const fillOpacityOf = (fill: string | null | undefined): number =>
  !fill ? 0 : fill.length > 7 ? Math.round((parseInt(fill.slice(7, 9), 16) * 100) / 255) : 100;

/** What the bucket paints with when no opacity was chosen yet: the old "Light" wash. */
export const FILL_WASH = 18;
