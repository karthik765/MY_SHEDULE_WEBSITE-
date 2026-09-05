"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import ChapterEmblem from "./ChapterEmblem";

const scenes: Record<string, { name: string; label: string; mark: string }> = {
  schedule: { name: "chronograph", label: "TIME / BY DESIGN", mark: "24" },
  habits: { name: "ritual", label: "SMALL ACTIONS / LASTING CHANGE", mark: "01" },
  goals: { name: "summit", label: "THE NEXT SUMMIT", mark: "/" },
  topics: { name: "atlas", label: "YOUR KNOWLEDGE ATLAS", mark: "+" },
  minigames: { name: "arcade", label: "PRESS PLAY / RESET YOUR MIND", mark: "K" },
  analytics: { name: "signal", label: "EFFORT / MADE VISIBLE", mark: "~" },
  trophies: { name: "medal", label: "THE HALL OF PROGRESS", mark: "K" },
  "focus-points": { name: "medal", label: "YOUR ATTENTION HAS VALUE", mark: "+" },
  social: { name: "signal", label: "CONNECTED / NOT DISTRACTED", mark: "15" },
};

export default function SectionScene() {
  const section = usePathname().split("/")[1];
  const scene = scenes[section];
  if (!scene) return null;
  return <div className={`section-scene scene-${scene.name}`} aria-hidden="true">
    <div className="scene-halo" />
    {["trophies", "focus-points", "minigames", "schedule"].includes(section) ? <div className="emblem-object"><ChapterEmblem section={section} /></div> : <div className="scene-object">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}</div>}
    <div className="scene-reticle"><span /><span /><span /><span /></div>
    <small>{scene.label}</small>
  </div>;
}
