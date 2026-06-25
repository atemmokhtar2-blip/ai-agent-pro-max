import { useEffect, useRef } from "react";

interface DataCoreProps {
  size?: number;
  color?: string;
  active?: boolean;
}

export function DataCore({ size = 48, color = "#6366f1", active = true }: DataCoreProps) {
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
    const R = size * 0.36;

    function hexToRgb(hex: string) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : { r: 99, g: 102, b: 241 };
    }
    const { r, g, b } = hexToRgb(color);

    // Particles orbiting
    const PARTICLES = 6;
    const particles = Array.from({ length: PARTICLES }, (_, i) => ({
      angle: (i / PARTICLES) * Math.PI * 2,
      orbitR: R * (0.7 + Math.random() * 0.4),
      speed: 0.4 + Math.random() * 0.3,
      size: 1.5 + Math.random(),
    }));

    function drawHexagon(x: number, y: number, radius: number, rotation: number) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = rotation + (i * Math.PI) / 3;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, size, size);

      if (!active) {
        drawHexagon(cx, cy, R * 0.7, 0);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }

      // Outer rotating ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.6);
      ctx.translate(-cx, -cy);
      drawHexagon(cx, cy, R, 0);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Inner counter-rotating hex
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 0.4);
      ctx.translate(-cx, -cy);
      drawHexagon(cx, cy, R * 0.6, Math.PI / 6);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Core glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.4);
      grd.addColorStop(0, `rgba(${r},${g},${b},0.6)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Particles
      particles.forEach((p) => {
        p.angle += p.speed * 0.016;
        const px = cx + p.orbitR * Math.cos(p.angle);
        const py = cy + p.orbitR * Math.sin(p.angle);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
        ctx.fill();
      });
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
  }, [size, color, active]);

  return (
    <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden="true" />
  );
}
