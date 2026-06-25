import { useEffect, useRef } from "react";

interface GuardianProps {
  size?: number;
  color?: string;
  active?: boolean;
}

export function Guardian({ size = 48, color = "#6366f1", active = true }: GuardianProps) {
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
    const shieldH = size * 0.78;
    const shieldW = size * 0.62;

    function hexToRgb(hex: string) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : { r: 99, g: 102, b: 241 };
    }
    const { r, g, b } = hexToRgb(color);

    // Shield path (top rect + bottom point)
    function shieldPath(scale = 1) {
      const w = shieldW * scale;
      const h = shieldH * scale;
      const top = cy - h * 0.5;
      const left = cx - w * 0.5;
      ctx.beginPath();
      ctx.moveTo(left + w * 0.15, top);
      ctx.lineTo(left + w * 0.85, top);
      ctx.quadraticCurveTo(left + w, top, left + w, top + h * 0.15);
      ctx.lineTo(left + w, top + h * 0.55);
      ctx.quadraticCurveTo(left + w, top + h * 0.8, cx, top + h);
      ctx.quadraticCurveTo(left, top + h * 0.8, left, top + h * 0.55);
      ctx.lineTo(left, top + h * 0.15);
      ctx.quadraticCurveTo(left, top, left + w * 0.15, top);
      ctx.closePath();
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, size, size);

      if (!active) {
        shieldPath(0.9);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }

      // Pulse outer ring
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      const outerR = (size * 0.44) + pulse * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.1 + pulse * 0.1})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Shield fill
      shieldPath(0.9);
      const grd = ctx.createLinearGradient(cx, cy - shieldH * 0.45, cx, cy + shieldH * 0.45);
      grd.addColorStop(0, `rgba(${r},${g},${b},0.2)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0.05)`);
      ctx.fillStyle = grd;
      ctx.fill();

      // Shield stroke
      shieldPath(0.9);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.75)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Scanning line (sweeps down)
      const scanY = (cy - shieldH * 0.38) + ((t * 60) % (shieldH * 0.82));
      ctx.save();
      shieldPath(0.9);
      ctx.clip();
      const scanGrd = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
      scanGrd.addColorStop(0, `rgba(${r},${g},${b},0)`);
      scanGrd.addColorStop(0.5, `rgba(${r},${g},${b},${0.4 + pulse * 0.2})`);
      scanGrd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = scanGrd;
      ctx.fillRect(cx - shieldW * 0.45, scanY - 6, shieldW * 0.9, 12);
      ctx.restore();
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

  return <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden="true" />;
}
