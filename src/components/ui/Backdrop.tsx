/**
 * The ambient wash behind the home, nickname and PIN screens.
 *
 * These screens are mostly empty space, and the design fills it with soft
 * colour blooms and a few outlined shapes drifting behind the content — the
 * thing that makes an app with no content yet still feel like somewhere rather
 * than a blank form. It is purely decorative, so the whole layer is
 * `pointer-events: none` and carries no accessibility node.
 *
 * Positions are fractions of the viewport, so the composition survives a phone
 * screen and a widescreen monitor alike.
 */
import { GRID } from '../../lib/theme';

export type BackdropVariant = 'home' | 'nickname' | 'pin';

interface Bloom {
  cx: number;
  cy: number;
  /** Radius as a fraction of the larger viewport axis. */
  r: number;
  color: string;
  opacity: number;
}

const BLOOMS: Record<BackdropVariant, Bloom[]> = {
  home: [
    { cx: 1.06, cy: -0.04, r: 0.34, color: '#8E4EC6', opacity: 0.3 },
    { cx: -0.16, cy: 0.3, r: 0.3, color: '#30A46C', opacity: 0.26 },
    { cx: 1.08, cy: 1.03, r: 0.3, color: '#7A1F2B', opacity: 0.22 },
  ],
  nickname: [
    { cx: -0.12, cy: -0.03, r: 0.32, color: '#8E4EC6', opacity: 0.26 },
    { cx: 1.1, cy: 1.05, r: 0.34, color: '#30A46C', opacity: 0.24 },
  ],
  pin: [
    { cx: 0.5, cy: -0.1, r: 0.32, color: '#7A1F2B', opacity: 0.22 },
    { cx: -0.14, cy: 0.34, r: 0.28, color: '#30A46C', opacity: 0.22 },
  ],
};

interface Ornament {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  size: number;
  kind: 'square' | 'circle' | 'pill' | 'triangle' | 'glass' | 'dot';
  color: string;
  rotate?: number;
}

/**
 * Ornaments hug the edges: the middle of every one of these screens is a column
 * of text, and an outline crossing a heading turns decoration into noise.
 */
const ORNAMENTS: Record<BackdropVariant, Ornament[]> = {
  home: [
    { right: 0.02, top: 0.14, size: 92, kind: 'square', color: 'rgba(142,78,198,0.22)', rotate: 17 },
    { right: -0.04, top: 0.56, size: 120, kind: 'circle', color: 'rgba(48,164,108,0.2)' },
    { left: 0.01, bottom: 0.2, size: 58, kind: 'glass', color: 'var(--color-glass-solid)', rotate: -12 },
    { left: -0.02, top: 0.1, size: 64, kind: 'triangle', color: 'rgba(48,164,108,0.18)', rotate: 14 },
    { left: 0.06, top: 0.56, size: 90, kind: 'pill', color: 'rgba(122,31,43,0.16)', rotate: -8 },
    { right: 0.08, bottom: 0.08, size: 44, kind: 'dot', color: 'rgba(142,78,198,0.2)' },
  ],
  nickname: [
    { left: -0.05, top: 0.42, size: 110, kind: 'square', color: 'rgba(122,31,43,0.18)', rotate: 24 },
    { right: 0.02, bottom: 0.26, size: 74, kind: 'circle', color: 'rgba(142,78,198,0.2)' },
    { right: -0.02, top: 0.16, size: 70, kind: 'triangle', color: 'rgba(48,164,108,0.18)', rotate: -18 },
    { left: 0.02, bottom: 0.08, size: 52, kind: 'glass', color: 'var(--color-glass-solid)', rotate: 11 },
  ],
  pin: [
    { right: -0.06, top: 0.32, size: 150, kind: 'square', color: 'rgba(142,78,198,0.18)', rotate: -16 },
    { left: -0.04, bottom: 0.12, size: 76, kind: 'circle', color: 'rgba(48,164,108,0.2)' },
  ],
};

function OrnamentView({ o }: { o: Ornament }) {
  const position = {
    position: 'absolute' as const,
    ...(o.left !== undefined ? { left: `${o.left * 100}%` } : null),
    ...(o.right !== undefined ? { right: `${o.right * 100}%` } : null),
    ...(o.top !== undefined ? { top: `${o.top * 100}%` } : null),
    ...(o.bottom !== undefined ? { bottom: `${o.bottom * 100}%` } : null),
    ...(o.rotate ? { transform: `rotate(${o.rotate}deg)` } : null),
  };

  switch (o.kind) {
    case 'square':
      return (
        <div
          style={{
            ...position,
            width: o.size,
            height: o.size,
            borderRadius: o.size * 0.24,
            border: `2px solid ${o.color}`,
          }}
        />
      );
    case 'circle':
      return (
        <div
          style={{
            ...position,
            width: o.size,
            height: o.size,
            borderRadius: '50%',
            border: `2px solid ${o.color}`,
          }}
        />
      );
    case 'pill':
      return (
        <div
          style={{
            ...position,
            width: o.size,
            height: o.size * 0.29,
            borderRadius: 999,
            border: `2px solid ${o.color}`,
          }}
        />
      );
    case 'dot':
      return (
        <div
          style={{
            ...position,
            width: o.size,
            height: o.size,
            borderRadius: '50%',
            background: o.color,
          }}
        />
      );
    case 'glass':
      return (
        <div
          style={{
            ...position,
            width: o.size,
            height: o.size,
            borderRadius: o.size * 0.24,
            background: 'linear-gradient(150deg,var(--color-glass-solid),var(--color-glass))',
            border: `1px solid ${o.color}`,
            backdropFilter: 'blur(8px)',
          }}
        />
      );
    case 'triangle':
      return (
        <div
          style={{
            ...position,
            width: o.size,
            height: o.size,
            background: o.color,
            clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
          }}
        />
      );
  }
}

export function Backdrop({ variant }: { variant: BackdropVariant }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The ground is the whiteboard itself — its colour and its dot grid — so
          the home modal sits over a board rather than over a wash. */}
      <div
        className="absolute inset-0 bg-background"
        style={{
          backgroundImage: `radial-gradient(var(--color-line-dashed) 1.2px, transparent 1.4px)`,
          backgroundSize: `${GRID.step}px ${GRID.step}px`,
          backgroundPosition: '13px 13px',
        }}
      />
      {BLOOMS[variant].map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${b.cx * 100}%`,
            top: `${b.cy * 100}%`,
            width: `${b.r * 200}vmax`,
            height: `${b.r * 200}vmax`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${b.color} 0%, transparent 70%)`,
            opacity: b.opacity,
            filter: 'blur(6px)',
          }}
        />
      ))}
      {ORNAMENTS[variant].map((o, i) => (
        <OrnamentView key={i} o={o} />
      ))}
    </div>
  );
}
