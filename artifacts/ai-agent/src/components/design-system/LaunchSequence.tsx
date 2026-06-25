import { useEffect, useRef } from "react";

interface LaunchSequenceProps {
  size?: number;
  color?: string;
  progress?: number; // 0–1
  active?: boolean;
}

export function LaunchSequence({ size = 48, color = "#6366f1", progress = 0, active = true }: LaunchSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const displayProgressRef = useRef(progress);

  useEffect(() => {
    displayProgressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D as CanvasRenderingContext2D;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.4;
    const trackW = size * 0.08;

    function hexToRgb(hex: string) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : { r: 99, g: 102, b: 241 };
    }
    const { r, g, b } = hexToRgb(color);

    function draw(t: number) {
      ctx.clearRect(0, 0, size, size);

      const p = displayProgressRef.current;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * p;

      // Track
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.12)`;
      ctx.lineWidth = trackW;
      ctx.stroke();

      // Progress arc
      if (p > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
        ctx.lineWidth = trackW;
        ctx.lineCap = "round";
        ctx.stroke();

        // Glow on tip
        const tipX = cx + R * Math.cos(endAngle);
        const tipY = cy + R * Math.sin(endAngle);
        const grd = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, trackW * 1.5);
        grd.addColorStop(0, `rgba(${r},${g},${b},0.6)`);
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(tipX, tipY, trackW * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      if (active && p < 1) {
        // Pulsing center dot
        const pulse = 1 + 0.15 * Math.sin(t * 3);
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.12 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
        ctx.fill();
      } else if (p >= 1) {
        // Completion state — checkmark
        ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.11, cy);
        ctx.lineTo(cx - size * 0.03, cy + size * 0.1);
        ctx.lineTo(cx + size * 0.13, cy - size * 0.09);
        ctx.stroke();
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
  }, [size, color, active]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden="true" />;
}
