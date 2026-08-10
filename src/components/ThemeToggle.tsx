"use client";

import { useTheme } from "@/lib/useTheme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="comic-btn ml-auto px-3 py-1.5 text-base"
      style={{ backgroundColor: "var(--panel)" }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
