"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function resolveTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Tracks the currently active theme (explicit toggle choice, falling back to
 * system preference). Reacts to both system-preference changes and to
 * `data-theme` being flipped elsewhere (e.g. by the toggle button) via a
 * MutationObserver, so no shared context/provider is needed.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from DOM/localStorage on mount
    setTheme(resolveTheme());

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => setTheme(resolveTheme());
    mediaQuery.addEventListener("change", onMediaChange);

    const observer = new MutationObserver(() => setTheme(resolveTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      mediaQuery.removeEventListener("change", onMediaChange);
      observer.disconnect();
    };
  }, []);

  function toggle() {
    const next: Theme = resolveTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setTheme(next);
  }

  return { theme, toggle };
}
