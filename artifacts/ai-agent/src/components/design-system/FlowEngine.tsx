import { useEffect, useRef } from "react";

interface FlowEngineProps {
  width?: number;
  height?: number;
  color?: string;
  active?: boolean;
}

export function FlowEngine({ width = 100, height = 40, color = "#6366f1", active = true }: FlowEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    function hexToRgb(hex: string) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : { r: 99, g: 102, b: 241 };
    }
    const { r, g, b } = hexToRgb(color);

    const LANES = 3;
    const laneH = height / LANES;
    const SEGMENT_W = 18;
    const GAP = 6;

    // Each lane has independent offset and speed
    const lanes = Array.from({ length: LANES }, (_, i) => ({
      offset: (i * width * 0.33),
      speed: 28 + i * 8,
      alpha: 0.55 - i * 0.1,
    }));

    function draw(t: number) {
      ctx.clearRect(0, 0, width, height);

      lanes.forEach((lane, li) => {
        const y = li * laneH + laneH * 0.25;
        const h = laneH * 0.5;
        const offset = (lane.offset + lane.speed * t) % (SEGMENT_W + GAP);

        // Draw segments
        for (let x = -SEGMENT_W + (offset % (SEGMENT_W + GAP)); x < width + SEGMENT_W; x += SEGMENT_W + GAP) {
          const alpha = active ? lane.alpha * (0.5 + 0.5 * Math.sin(t * 1.5 + li)) : 0.15;
          ctx.beginPath();
          ctx.roundRect(x, y, SEGMENT_W, h, 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.fill();

          // Leading bright edge
          if (active) {
            ctx.beginPath();
            ctx.roundRect(x + SEGMENT_W - 3, y, 3, h, [0, 2, 2, 0]);
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 1.8})`;
            ctx.fill();
          }
        }
      });

      // Arrow indicators at right edge
      if (active) {
        for (let li = 0; li < LANES; li++) {
          const y = li * laneH + laneH * 0.5;
          const alpha = 0.4 + 0.3 * Math.sin(t * 2 + li * 0.7);
          ctx.beginPath();
          ctx.moveTo(width - 6, y - 4);
          ctx.lineTo(width - 2, y);
          ctx.lineTo(width - 6, y + 4);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }

    let last = 0;
    function loop(ts: number) {
      timeRef.current += (ts - last) / 1000;
      last = ts;
      draw(timeRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame((ts) => { last = ts; loop(ts); });

    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, color, active]);

  return <canvas ref={canvasRef} style={{ width, height }} aria-hidden="true" />;
}
