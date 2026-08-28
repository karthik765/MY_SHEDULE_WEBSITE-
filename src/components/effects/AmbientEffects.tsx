"use client";

import { useEffect, useRef } from "react";

// Two lightweight canvases, one RAF loop each, both plain 2D canvas (no
// WebGL — this runs on every page, so it has to be cheap):
//  - a sparse drifting-ember backdrop (fixed, behind content, low density —
//    "not the complete background", just atmosphere in the gaps)
//  - a mouse-move ember trail (fixed, above content, pointer-events:none)
// Both read the page's own --comic-orange/--comic-yellow tokens so they
// stay on-theme in light or dark mode without duplicating color logic.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: "orange" | "amber";
}

function readAccent(name: string): string {
  if (typeof window === "undefined") return "#ff7a1a";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#ff7a1a";
}

export default function AmbientEffects() {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const bgCanvas = bgRef.current;
    const trailCanvas = trailRef.current;
    if (!bgCanvas || !trailCanvas) return;
    const bgCtx = bgCanvas.getContext("2d");
    const trailCtx = trailCanvas.getContext("2d");
    if (!bgCtx || !trailCtx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      for (const c of [bgCanvas, trailCanvas]) {
        if (!c) continue;
        c.width = width * dpr;
        c.height = height * dpr;
        c.style.width = `${width}px`;
        c.style.height = `${height}px`;
        const ctx = c.getContext("2d");
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    resize();
    window.addEventListener("resize", resize);

    // ---- ambient backdrop: sparse, slow, always-on embers ----
    const AMBIENT_COUNT = 26;
    const ambient: Particle[] = Array.from({ length: AMBIENT_COUNT }, () => spawnAmbient(width, height));

    function spawnAmbient(w: number, h: number): Particle {
      return {
        x: Math.random() * w,
        y: h + Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.18 - Math.random() * 0.28,
        life: 0,
        maxLife: 900 + Math.random() * 900,
        size: 1 + Math.random() * 2.2,
        hue: Math.random() > 0.5 ? "orange" : "amber",
      };
    }

    // ---- cursor trail: short-lived sparks spawned on mousemove ----
    const trail: Particle[] = [];
    let lastSpawn = 0;

    function onPointerMove(e: PointerEvent) {
      const now = performance.now();
      if (now - lastSpawn < 26) return; // throttle spawn rate
      lastSpawn = now;
      for (let i = 0; i < 2; i++) {
        trail.push({
          x: e.clientX + (Math.random() - 0.5) * 6,
          y: e.clientY + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.3 - Math.random() * 0.5,
          life: 0,
          maxLife: 34 + Math.random() * 20,
          size: 1.2 + Math.random() * 1.8,
          hue: Math.random() > 0.4 ? "orange" : "amber",
        });
      }
      if (trail.length > 160) trail.splice(0, trail.length - 160);
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const orange = readAccent("--comic-orange");
    const amber = readAccent("--comic-yellow");

    let rafId: number;
    function frame() {
      // Ambient layer
      bgCtx!.clearRect(0, 0, width, height);
      for (const p of ambient) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        const t = p.life / p.maxLife;
        const fade = t < 0.15 ? t / 0.15 : t > 0.8 ? Math.max(0, (1 - t) / 0.2) : 1;
        const alpha = fade * 0.32;
        if (alpha > 0.01) {
          bgCtx!.beginPath();
          bgCtx!.fillStyle = p.hue === "orange" ? orange : amber;
          bgCtx!.globalAlpha = alpha;
          bgCtx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          bgCtx!.fill();
        }
        if (p.life >= p.maxLife || p.y < -20) Object.assign(p, spawnAmbient(width, height));
      }
      bgCtx!.globalAlpha = 1;

      // Trail layer
      trailCtx!.clearRect(0, 0, width, height);
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.006; // slight upward accel, like rising heat
        const t = p.life / p.maxLife;
        if (t >= 1) {
          trail.splice(i, 1);
          continue;
        }
        const alpha = 1 - t;
        trailCtx!.beginPath();
        trailCtx!.fillStyle = p.hue === "orange" ? orange : amber;
        trailCtx!.globalAlpha = alpha * 0.85;
        trailCtx!.arc(p.x, p.y, p.size * (1 - t * 0.4), 0, Math.PI * 2);
        trailCtx!.fill();
      }
      trailCtx!.globalAlpha = 1;

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <>
      <canvas ref={bgRef} className="ambient-bg-canvas" aria-hidden="true" />
      <canvas ref={trailRef} className="ambient-trail-canvas" aria-hidden="true" />
    </>
  );
}
