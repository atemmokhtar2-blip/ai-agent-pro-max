import { useEffect, useRef } from "react";

interface AIPulseProps {
  size?: number;
  color?: string;
  active?: boolean;
}

export function AIPulse({ size = 48, color = "#6366f1", active = true }: AIPulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const baseR = size * 0.18;

    function hexToRgb(hex: string) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? { r: parseInt(result[1]!, 16), g: parseInt(result[2]!, 16), b: parseInt(result[3]!, 16) }
        : { r: 99, g: 102, b: 241 };
    }
    const { r, g, b } = hexToRgb(color);

    function draw(t: number) {
      ctx.clearRect(0, 0, size, size);

      if (!active) {
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.25)`;
        ctx.fill();
        return;
      }

      // Breathing core
      const breathe = 1 + 0.12 * Math.sin(t * 1.8);
      const coreR = baseR * breathe;

      // Outer glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5);
      grd.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core circle
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.fill();

      // Pulse rings (2)
      for (let i = 0; i < 2; i++) {
        const phase = ((t * 0.7 + i * 0.5) % 1.4) / 1.4;
        if (phase < 0) continue;
        const ringR = baseR + phase * (size * 0.42);
        const alpha = (1 - phase) * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 1.5 * (1 - phase * 0.6);
        ctx.stroke();
      }
    }

    let last = 0;
    function loop(ts: number) {
      const dt = (ts - last) / 1000;
      last = ts;
      timeRef.current += dt;
      draw(timeRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame((ts) => {
      last = ts;
      loop(ts);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [size, color, active]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
