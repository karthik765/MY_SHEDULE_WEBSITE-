"use client";

import { useTheme } from "@/lib/useTheme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="px-3 py-1.5 text-base"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
