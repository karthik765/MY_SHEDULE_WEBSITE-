"use client";

import { useZoomMode, type ZoomMode } from "@/lib/useZoom";

const OPTIONS: { value: ZoomMode; label: string; title: string }[] = [
  { value: "minimize", label: "−", title: "Minimize — shrink the whole site" },
  { value: "default", label: "•", title: "Default size" },
  { value: "maximize", label: "+", title: "Maximize — zoom the whole site in" },
];

export default function ZoomControl() {
  const { zoomMode, setZoomMode } = useZoomMode();

  return (
    <div className="zoom-control" title="Page size">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setZoomMode(opt.value)}
          aria-label={opt.title}
          aria-pressed={zoomMode === opt.value}
          title={opt.title}
          className="px-2.5 py-1.5 text-sm font-bold leading-none"
          style={{
            backgroundColor: zoomMode === opt.value ? "var(--ink)" : "transparent",
            color: zoomMode === opt.value ? "var(--paper)" : "var(--ink)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
