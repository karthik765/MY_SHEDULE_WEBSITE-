"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useMotion } from "@/lib/useMotion";

function KArtwork({ priority = false }: { priority?: boolean }) {
  return <div className="k-artwork"><Image src="/cinematic/k-obsidian.png" alt="" fill sizes="(max-width: 600px) 85vw, (max-width: 1100px) 45vw, 650px" priority={priority} className="k-artwork-image" /></div>;
}

const Scene = dynamic(() => import("@/components/three/KScene"), { ssr: false, loading: () => <KArtwork /> });

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <KArtwork /> : this.props.children; }
}

export default function Sculpture({ active = false, live = false, priority = false }: { active?: boolean; live?: boolean; priority?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { enabled } = useMotion();
  useEffect(() => {
    let intersecting = false;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); });
    if (host.current) observer.observe(host.current);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (!enabled || !visible) {
      element.style.setProperty("--look-x", "0deg");
      element.style.setProperty("--look-y", "0deg");
      return;
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      element.style.setProperty("--look-x", ((event.clientY / innerHeight - .5) * -5).toFixed(2) + "deg");
      element.style.setProperty("--look-y", ((event.clientX / innerWidth - .5) * 7).toFixed(2) + "deg");
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [enabled, visible]);
  return <div ref={host} className={`sculpture ${active ? "is-active" : ""} ${visible && enabled ? "is-moving" : "is-still"}`} aria-hidden="true"><div className="sculpture-aura" />{live && enabled ? <SceneBoundary><Scene moving={visible && enabled} active={active} /></SceneBoundary> : <><div className="sculpture-pedestal" /><div className="k-camera"><KArtwork priority={priority} /></div></>}</div>;
}
