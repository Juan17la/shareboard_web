/**
 * Viewport size, for the handful of places the layout is decided in JS rather
 * than in CSS — the tool rail's own offsets and the header's right-hand gutter,
 * which have to agree on exact pixel values.
 *
 * Breakpoints come from `Layout` in `lib/theme.ts`, the same numbers the mobile
 * app uses (mobile/docs/03-styles).
 */
import { useEffect, useState } from 'react';

export interface Viewport {
  width: number;
  height: number;
}

const read = (): Viewport =>
  typeof window === 'undefined'
    ? { width: 1024, height: 768 }
    : { width: window.innerWidth, height: window.innerHeight };

export function useViewport(): Viewport {
  const [size, setSize] = useState(read);

  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener('resize', onResize);
    // An orientation change on a phone fires `resize` late on some browsers.
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return size;
}
