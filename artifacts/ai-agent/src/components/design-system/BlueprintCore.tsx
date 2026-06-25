import { useEffect, useRef } from "react";

interface BlueprintCoreProps {
  size?: number;
  color?: string;
  complete?: boolean;
  active?: boolean;
}

export function BlueprintCore({ size = 48, color = "#6366f1", complete = false, active = true }: BlueprintCoreProps) {
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

    const GRID = 5;
    const pad = size * 0.08;
    const cellW = (size - pad * 2) / GRID;
    const cellH = (size - pad * 2) / GRID;

    function hexToRgb(hex: string) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : { r: 99, g: 102, b: 241 };
    }
    const { r, g, b } = hexToRgb(color);

    function draw(t: number) {
      ctx.clearRect(0, 0, size, size);

      // Grid lines
      ctx.strokeStyle = `rgba(${r},${g},${b},0.12)`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID; i++) {
        const x = pad + i * cellW;
        const y = pad + i * cellH;
        ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, size - pad); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(size - pad, y); ctx.stroke();
      }

      if (!active && !complete) return;

      // Fill cells progressively based on time
      const totalCells = GRID * GRID;
      const filledCount = complete
        ? totalCells
        : Math.min(totalCells, Math.floor(t * 4));

      for (let i = 0; i < filledCount; i++) {
        const row = Math.floor(i / GRID);
        const col = i % GRID;
        const x = pad + col * cellW + 1;
        const y = pad + row * cellH + 1;
        const w = cellW - 2;
        const h = cellH - 2;
        const age = t - i / 4;
        const alpha = Math.min(1, age * 3) * (complete ? 0.65 : 0.4);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(x, y, w, h);
      }

      if (complete) {
        // Burst animation rings
        for (let ring = 0; ring < 2; ring++) {
          const phase = ((t * 0.8 + ring * 0.4) % 1.2) / 1.2;
          const ringR = size * 0.1 + phase * size * 0.45;
          const alpha = (1 - phase) * 0.35;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Center checkmark
        const cx = size / 2;
        const cy = size / 2;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.12, cy + size * 0.01);
        ctx.lineTo(cx - size * 0.02, cy + size * 0.11);
        ctx.lineTo(cx + size * 0.14, cy - size * 0.1);
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
  }, [size, color, complete, active]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden="true" />;
}
