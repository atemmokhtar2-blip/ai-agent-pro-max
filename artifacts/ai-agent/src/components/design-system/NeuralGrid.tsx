import { useEffect, useRef } from "react";

interface NeuralGridProps {
  width?: number;
  height?: number;
  color?: string;
  active?: boolean;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pulse: number;
}

export function NeuralGrid({ width = 120, height = 80, color = "#6366f1", active = true }: NeuralGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D as CanvasRenderingContext2D;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    function hexToRgb(hex: string) {
      const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return r ? { r: parseInt(r[1]!, 16), g: parseInt(r[2]!, 16), b: parseInt(r[3]!, 16) } : { r: 99, g: 102, b: 241 };
    }
    const { r, g, b } = hexToRgb(color);

    const NODE_COUNT = 8;
    const CONNECT_DIST = Math.min(width, height) * 0.75;

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Traveling signal along each edge
    interface Signal { from: number; to: number; t: number; speed: number }
    const signals: Signal[] = [];

    let frame = 0;

    function draw() {
      ctx.clearRect(0, 0, width, height);

      if (!active) {
        nodes.forEach((n) => {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},0.2)`;
          ctx.fill();
        });
        return;
      }

      // Update nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 4 || n.x > width - 4) n.vx *= -1;
        if (n.y < 4 || n.y > height - 4) n.vy *= -1;
        n.pulse += 0.04;
      });

      // Spawn signals occasionally
      if (frame % 40 === 0) {
        const from = Math.floor(Math.random() * NODE_COUNT);
        const to = Math.floor(Math.random() * NODE_COUNT);
        if (from !== to) signals.push({ from, to, t: 0, speed: 0.015 + Math.random() * 0.01 });
      }
      frame++;

      // Draw edges
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const dx = nodes[i]!.x - nodes[j]!.x;
          const dy = nodes[i]!.y - nodes[j]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.3;
            ctx.beginPath();
            ctx.moveTo(nodes[i]!.x, nodes[i]!.y);
            ctx.lineTo(nodes[j]!.x, nodes[j]!.y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw signals
      for (let s = signals.length - 1; s >= 0; s--) {
        const sig = signals[s]!;
        sig.t += sig.speed;
        if (sig.t >= 1) { signals.splice(s, 1); continue; }
        const from = nodes[sig.from]!;
        const to = nodes[sig.to]!;
        const sx = from.x + (to.x - from.x) * sig.t;
        const sy = from.y + (to.y - from.y) * sig.t;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
        ctx.fill();
      }

      // Draw nodes
      nodes.forEach((n) => {
        const pulsed = 1 + 0.25 * Math.sin(n.pulse);
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 6 * pulsed);
        grd.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, 6 * pulsed, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
        ctx.fill();
      });
    }

    function loop() {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height, color, active]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
