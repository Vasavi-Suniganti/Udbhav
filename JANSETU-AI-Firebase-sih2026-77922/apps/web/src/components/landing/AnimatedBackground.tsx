import { useEffect, useRef } from "react";
import type { Theme } from "@/lib/theme";

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

export function AnimatedBackground({ theme }: { theme: Theme }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let nodes: Node[] = [];
    let w = wrap.clientWidth;
    let h = wrap.clientHeight;
    let raf = 0;

    const ns = "http://www.w3.org/2000/svg";
    const lineLayer = svg.querySelector("[data-lines]") as SVGGElement;
    const dotLayer = svg.querySelector("[data-dots]") as SVGGElement;

    const rebuild = () => {
      w = wrap.clientWidth || window.innerWidth;
      h = wrap.clientHeight || window.innerHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const count = Math.max(28, Math.min(70, Math.floor((w * h) / 28000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.38,
        vy: (Math.random() - 0.5) * 0.38,
        r: 1.5 + Math.random() * 2.2,
      }));
      if (lineLayer) lineLayer.replaceChildren();
      if (dotLayer) dotLayer.replaceChildren();
      for (const n of nodes) {
        const c = document.createElementNS(ns, "circle");
        c.setAttribute("r", String(n.r));
        c.setAttribute("fill", "currentColor");
        c.setAttribute("fill-opacity", "0.9");
        c.setAttribute("cx", String(n.x));
        c.setAttribute("cy", String(n.y));
        if (dotLayer) dotLayer.appendChild(c);
      }
    };

    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(wrap);

    const tick = () => {
      const maxDist = Math.min(190, w * 0.16);
      if (!reduced) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
      }
      if (dotLayer) {
        const dots = dotLayer.children;
        for (let i = 0; i < nodes.length; i++) {
          const el = dots[i] as SVGCircleElement | undefined;
          if (el) {
            el.setAttribute("cx", String(nodes[i].x));
            el.setAttribute("cy", String(nodes[i].y));
          }
        }
      }
      if (lineLayer) {
        lineLayer.replaceChildren();
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const d = Math.hypot(dx, dy);
            if (d < maxDist) {
              const line = document.createElementNS(ns, "line");
              line.setAttribute("x1", String(nodes[i].x));
              line.setAttribute("y1", String(nodes[i].y));
              line.setAttribute("x2", String(nodes[j].x));
              line.setAttribute("y2", String(nodes[j].y));
              line.setAttribute("stroke", "currentColor");
              line.setAttribute("stroke-width", "1");
              line.setAttribute("stroke-opacity", String((1 - d / maxDist) * 0.42));
              lineLayer.appendChild(line);
            }
          }
        }
      }
      if (!reduced) raf = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme]);

  return (
    <div ref={wrapRef} className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-luminosity"
        autoPlay
        muted
        loop
        playsInline
        src="/hero-bg.mp4"
      />
      <svg ref={svgRef} className="absolute inset-0 h-full w-full text-accent">
        <g data-lines />
        <g data-dots />
      </svg>
      <div className="absolute inset-0 bg-bg/45" />
    </div>
  );
}

export default AnimatedBackground;
