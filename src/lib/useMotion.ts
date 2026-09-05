"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => { observer.disconnect(); media.removeEventListener("change", onChange); };
}

function snapshot() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "reduced";
  return document.documentElement.dataset.motion === "off" ? "off" : "on";
}

export function useMotion() {
  const mode = useSyncExternalStore(subscribe, snapshot, () => "off");
  return {
    enabled: mode === "on",
    reduced: mode === "reduced",
    toggle() {
      const next = mode === "on" ? "off" : "on";
      document.documentElement.dataset.motion = next;
      try { localStorage.setItem("cinematic-motion", next); } catch {}
    },
  };
}
