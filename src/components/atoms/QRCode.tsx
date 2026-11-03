/**
 * Renders a board link as a scannable QR code, drawn as one SVG path.
 *
 * Every dark module becomes a subpath of a single `<path>` rather than its own
 * `<rect>`: a version-4 code is over a thousand modules, and a thousand nodes
 * is enough to be felt when the share sheet opens.
 */
import { useMemo } from 'react';

import { encodeQr } from '../../lib/qr';

export function QRCode({
  value,
  size = 96,
  /** Always dark: the card is white in both themes and scanners need dark-on-light. */
  color = '#000000',
  /** Quiet zone in modules. The spec asks for 4; the card border stands in for
   *  most of it, so 2 keeps the code dense without hurting scans. */
  quietZone = 2,
}: {
  value: string;
  size?: number;
  color?: string;
  quietZone?: number;
}) {
  const path = useMemo(() => {
    try {
      const code = encodeQr(value);
      let d = '';
      for (let r = 0; r < code.size; r++) {
        for (let c = 0; c < code.size; c++) {
          if (code.modules[r][c]) d += `M${c + quietZone} ${r + quietZone}h1v1h-1z`;
        }
      }
      return { d, span: code.size + quietZone * 2 };
    } catch {
      return null;
    }
  }, [value, quietZone]);

  return (
    <div
      title={value}
      className="grid flex-none place-items-center rounded-md border border-line bg-white p-1.5"
      style={{ width: size, height: size }}
    >
      {path ? (
        <svg width="100%" height="100%" viewBox={`0 0 ${path.span} ${path.span}`} aria-hidden="true">
          <path d={path.d} fill={color} />
        </svg>
      ) : (
        <span className="text-[9px] text-text-tertiary">—</span>
      )}
    </div>
  );
}
