"use client";

import { useEffect, useState } from "react";

export type ZoomMode = "default" | "minimize" | "maximize";
const ZOOM_STORAGE_KEY = "zoom-mode";

function resolveZoom(): ZoomMode {
  const explicit = document.documentElement.dataset.zoom;
  if (explicit === "minimize" || explicit === "maximize") return explicit;
  return "default";
}

/**
 * Tracks the site-wide page-size mode (default/minimize/maximize), applied
 * as CSS `zoom` on <html> via a data-zoom attribute — set on every page
 * from a persisted choice (localStorage), same pattern as useTheme.
 */
export function useZoomMode() {
  const [zoomMode, setZoomModeState] = useState<ZoomMode>("default");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from DOM/localStorage on mount
    setZoomModeState(resolveZoom());

    const observer = new MutationObserver(() => setZoomModeState(resolveZoom()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-zoom"] });
    return () => observer.disconnect();
  }, []);

  function setZoomMode(next: ZoomMode) {
    if (next === "default") {
      delete document.documentElement.dataset.zoom;
      localStorage.removeItem(ZOOM_STORAGE_KEY);
    } else {
      document.documentElement.dataset.zoom = next;
      localStorage.setItem(ZOOM_STORAGE_KEY, next);
    }
    setZoomModeState(next);
  }

  return { zoomMode, setZoomMode };
}
