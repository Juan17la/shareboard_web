/**
 * The laser pointer: a red trail that fades out a second after it is drawn,
 * yours and everyone else's. Never on the board and never stored: peers send
 * it as their cursor with `laser: true`, and each point lives here until it
 * fades. It paints on a canvas of its own, so a trail never repaints the board.
 */
import { useEffect, useRef } from 'react';

import { useBoardStore } from '../../features/board-store';
import { FADE_MS, LASER, trails, setWake } from './laser';

export function LaserLayer() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let frame: number | null = null;
    const draw = () => {
      frame = null;
      const canvas = ref.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const now = performance.now();
      const { camera } = useBoardStore.getState();
      ctx.strokeStyle = LASER;
      ctx.lineCap = 'round';
      ctx.shadowColor = LASER;
      ctx.shadowBlur = 8;
      for (const [who, trail] of trails) {
        while (trail.length && now - trail[0].t > FADE_MS) trail.shift();
        if (!trail.length) {
          trails.delete(who);
          continue;
        }
        // Each segment fades with its age and thins toward the tail.
        for (let i = 1; i < trail.length; i++) {
          const life = 1 - (now - trail[i].t) / FADE_MS;
          ctx.globalAlpha = life;
          ctx.lineWidth = 2 + 3 * life;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x * camera.scale + camera.x, trail[i - 1].y * camera.scale + camera.y);
          ctx.lineTo(trail[i].x * camera.scale + camera.x, trail[i].y * camera.scale + camera.y);
          ctx.stroke();
        }
        const tip = trail[trail.length - 1];
        ctx.globalAlpha = 1 - (now - tip.t) / FADE_MS;
        ctx.fillStyle = LASER;
        ctx.beginPath();
        ctx.arc(tip.x * camera.scale + camera.x, tip.y * camera.scale + camera.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Keep going only while something is still fading.
      if (trails.size) frame = requestAnimationFrame(draw);
    };
    setWake(() => {
      if (frame === null) frame = requestAnimationFrame(draw);
    });
    return () => {
      setWake(null);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
