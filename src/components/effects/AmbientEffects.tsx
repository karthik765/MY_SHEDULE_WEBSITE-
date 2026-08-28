"use client";

import { useEffect, useRef } from "react";

// One canvas, one RAF loop, plain 2D (no WebGL — this runs on every page, so
// it has to be cheap): a backdrop with SEVERAL distinct ambient motions
// layered together (rising embers, falling ash, stationary twinkles, and
// periodic expanding pulse-ring "shockwaves") — fixed, behind content,
// sparse — "not the complete background", just atmosphere in the gaps.
// No mouse-following effect — the cursor stays a plain, normal cursor.
// Reads the page's own --comic-orange/--comic-yellow tokens, which are now
// both orange, so this is orange-only too without any special-casing.

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

interface Pulse {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  maxRadius: number;
}

function readAccent(name: string): string {
  if (typeof window === "undefined") return "#ff7a1a";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#ff7a1a";
}

function pick<T>(a: T, b: T): T {
  return Math.random() > 0.5 ? a : b;
}

export default function AmbientEffects() {
  const bgRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const bgCanvas = bgRef.current;
    if (!bgCanvas) return;
    const bgCtx = bgCanvas.getContext("2d");
    if (!bgCtx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      bgCanvas!.width = width * dpr;
      bgCanvas!.height = height * dpr;
      bgCanvas!.style.width = `${width}px`;
      bgCanvas!.style.height = `${height}px`;
      bgCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const orange = readAccent("--comic-orange");
    const amber = readAccent("--comic-yellow");
    const colorFor = (h: "orange" | "amber") => (h === "orange" ? orange : amber);

    // ---- layer 1: embers rising from below ----
    const RISERS = 200;
    function spawnRiser(w: number, h: number): Particle {
      return {
        x: Math.random() * w,
        y: h + Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.18 - Math.random() * 0.28,
        life: 0,
        maxLife: 900 + Math.random() * 900,
        size: 1 + Math.random() * 2.2,
        hue: pick("orange", "amber"),
      };
    }
    const risers: Particle[] = Array.from({ length: RISERS }, () => spawnRiser(width, height));

    // ---- layer 2: fine ash drifting down from above, opposite motion ----
    const FALLERS = 160;
    function spawnFaller(w: number): Particle {
      return {
        x: Math.random() * w,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.35,
        vy: 0.12 + Math.random() * 0.2,
        life: 0,
        maxLife: 1100 + Math.random() * 800,
        size: 0.8 + Math.random() * 1.4,
        hue: pick("amber", "orange"),
      };
    }
    const fallers: Particle[] = Array.from({ length: FALLERS }, () => spawnFaller(width));

    // ---- layer 3: stationary twinkles, fade in/out in place ----
    const TWINKLES = 220;
    function spawnTwinkle(w: number, h: number) {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.8,
        size: 0.8 + Math.random() * 1.6,
        hue: pick("orange", "amber") as "orange" | "amber",
      };
    }
    const twinkles = Array.from({ length: TWINKLES }, () => spawnTwinkle(width, height));

    // ---- layer 4: periodic expanding pulse rings — the "shockwave" beat ----
    const pulses: Pulse[] = [];
    let nextPulseAt = performance.now() + 400 + Math.random() * 800;

    let rafId: number;
    function frame() {
      const now = performance.now();
      bgCtx!.clearRect(0, 0, width, height);

      // Risers
      for (const p of risers) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        const t = p.life / p.maxLife;
        const fade = t < 0.15 ? t / 0.15 : t > 0.8 ? Math.max(0, (1 - t) / 0.2) : 1;
        const alpha = fade * 0.32;
        if (alpha > 0.01) {
          bgCtx!.beginPath();
          bgCtx!.fillStyle = colorFor(p.hue);
          bgCtx!.globalAlpha = alpha;
          bgCtx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          bgCtx!.fill();
        }
        if (p.life >= p.maxLife || p.y < -20) Object.assign(p, spawnRiser(width, height));
      }

      // Fallers (ash) — opposite direction, slightly slower fade
      for (const p of fallers) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        const t = p.life / p.maxLife;
        const fade = t < 0.2 ? t / 0.2 : t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1;
        const alpha = fade * 0.22;
        if (alpha > 0.01) {
          bgCtx!.beginPath();
          bgCtx!.fillStyle = colorFor(p.hue);
          bgCtx!.globalAlpha = alpha;
          bgCtx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          bgCtx!.fill();
        }
        if (p.life >= p.maxLife || p.y > height + 20) Object.assign(p, spawnFaller(width));
      }

      // Twinkles — stationary, pulsing alpha
      for (const tw of twinkles) {
        const alpha = (0.15 + 0.15 * Math.sin(now * 0.001 * tw.speed + tw.phase)) * 0.9;
        if (alpha > 0.03) {
          bgCtx!.beginPath();
          bgCtx!.fillStyle = colorFor(tw.hue);
          bgCtx!.globalAlpha = alpha;
          bgCtx!.arc(tw.x, tw.y, tw.size, 0, Math.PI * 2);
          bgCtx!.fill();
        }
      }

      // Pulse rings — rare expanding shockwaves
      if (now >= nextPulseAt) {
        pulses.push({
          x: Math.random() * width,
          y: Math.random() * height,
          life: 0,
          maxLife: 90,
          maxRadius: 70 + Math.random() * 60,
        });
        nextPulseAt = now + 800 + Math.random() * 1200;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i];
        pu.life++;
        const t = pu.life / pu.maxLife;
        if (t >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const r = pu.maxRadius * t;
        bgCtx!.beginPath();
        bgCtx!.strokeStyle = orange;
        bgCtx!.globalAlpha = (1 - t) * 0.28;
        bgCtx!.lineWidth = 1.5;
        bgCtx!.arc(pu.x, pu.y, r, 0, Math.PI * 2);
        bgCtx!.stroke();
      }

      bgCtx!.globalAlpha = 1;

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={bgRef} className="ambient-bg-canvas" aria-hidden="true" />;
}
