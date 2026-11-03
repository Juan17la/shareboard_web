/**
 * The ground behind the home, nickname and PIN screens: the whiteboard itself,
 * its colour and its dot grid, so those screens sit over a board, plain as
 * signage. Purely decorative, so the layer is `pointer-events: none` and carries no
 * accessibility node.
 */
import { GRID } from '../../lib/theme';

export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-background"
        style={{
          backgroundImage: `radial-gradient(var(--color-line-dashed) 1.2px, transparent 1.4px)`,
          backgroundSize: `${GRID.step}px ${GRID.step}px`,
          backgroundPosition: '13px 13px',
        }}
      />
    </div>
  );
}
