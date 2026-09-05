"use client";

import { useTheme } from "@/lib/useTheme";
import Icon from "./studio/Icon";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title={theme === "dark" ? "Light theme" : "Dark theme"} className="theme-switch">
    <span className={theme === "light" ? "is-selected" : ""}><Icon name="sun" size={15} /></span>
    <span className={theme === "dark" ? "is-selected" : ""}><Icon name="moon" size={15} /></span>
  </button>;
}
