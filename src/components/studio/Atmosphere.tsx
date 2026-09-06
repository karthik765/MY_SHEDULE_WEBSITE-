"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMotion } from "@/lib/useMotion";

export default function Atmosphere() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();
  const { enabled } = useMotion();

  useEffect(() => {
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    if (!surface || !ctx) return;
    let width = 0, height = 0, frame = 0, last = 0, phase = 0;
    const pointer = { x: 0, y: 0 };
    const embers = Array.from({ length: 110 }, (_, i) => ({ x: ((i * 127.37) % 997) / 997, y: ((i * 293.71) % 991) / 991, r: i % 8 === 0 ? 2.4 : 1.05 }));
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      embers.forEach((ember, i) => {
        const x = (ember.x * width + Math.sin(phase * .2 + i) * 16 + pointer.x * ember.r * 12 + width) % width;
        const y = ((ember.y * height - phase * (i % 3 + 1) * 14 + pointer.y * ember.r * 8) % height + height) % height;
        ctx.fillStyle = i % 4 === 0 ? "rgba(255,171,65,.95)" : "rgba(223,156,83,.5)";
        ctx.beginPath(); ctx.ellipse(x, y, ember.r * .55, ember.r * 1.8, .6, 0, Math.PI * 2); ctx.fill();
      });
    };
    const resize = () => {
      width = innerWidth; height = innerHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      surface.width = width * dpr; surface.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
    };
    const tick = (now: number) => {
      frame = 0;
      if (document.hidden || !enabled) return;
      if (now - last > 32) { phase += .032; draw(); last = now; }
      frame = requestAnimationFrame(tick);
    };
    const resume = () => { cancelAnimationFrame(frame); frame = 0; if (!document.hidden && enabled) frame = requestAnimationFrame(tick); else draw(); };
    const move = (event: PointerEvent) => {
      if (!enabled || event.pointerType !== "mouse") return;
      pointer.x = event.clientX / innerWidth - .5; pointer.y = event.clientY / innerHeight - .5;
    };
    resize(); resume();
    addEventListener("resize", resize); addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", resume);
    return () => { cancelAnimationFrame(frame); removeEventListener("resize", resize); removeEventListener("pointermove", move); document.removeEventListener("visibilitychange", resume); };
  }, [enabled]);

  // Switching a tab used to shake the entire page. Tab changes now animate the
  // tab marker and the incoming panel instead, so the only thing left worth a
  // whole-screen reaction is unlocking a trophy — and that gets a warm pulse
  // rather than a camera shake.
  useEffect(() => {
    if (!enabled) return;
    const celebrate = () => {
      document.querySelector(".page-enter")?.animate([
        { filter: "brightness(1)" }, { filter: "brightness(1.09)", offset: .3 }, { filter: "brightness(1)" },
      ], { duration: 620, easing: "ease-out" });
    };
    document.addEventListener("studio:achievement", celebrate);
    return () => document.removeEventListener("studio:achievement", celebrate);
  }, [enabled]);

  return <>
    <div className="atmosphere" aria-hidden="true"><div className="nebula nebula-one" /><div className="nebula nebula-two" /><div className="atmospheric-beam" /><div className="atmospheric-grid" /><canvas ref={canvas} /><div className="film-grain" /></div>
    <div key={pathname} className="route-flare" aria-hidden="true"><span>{pathname === "/" ? "OVERVIEW" : pathname.split("/")[1].replaceAll("-", " ")}</span><i /></div>
  </>;
}
