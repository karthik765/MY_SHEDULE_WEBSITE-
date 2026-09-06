"use client";

import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";
import { useTheme } from "@/lib/useTheme";
import { useMotion } from "@/lib/useMotion";
import { useZoomMode, type ZoomMode } from "@/lib/useZoom";

const ZOOM_OPTIONS: { value: ZoomMode; label: string }[] = [
  { value: "minimize", label: "Small" },
  { value: "default", label: "Normal" },
  { value: "maximize", label: "Large" },
];

/**
 * The one home for every app-wide preference. Theme, text size and motion used
 * to live in three unrelated corners of the screen (top bar, sidebar footer,
 * and a floating pill), which meant none of them were findable — this puts
 * them behind a single labelled control instead.
 */
export default function SettingsMenu() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const { theme, toggle: toggleTheme } = useTheme();
  const { enabled: motionOn, reduced: motionReduced, toggle: toggleMotion } = useMotion();
  const { zoomMode, setZoomMode } = useZoomMode();

  // Dismiss on outside click or Escape. Escape also returns focus to the
  // trigger so keyboard users don't get dropped at the top of the document.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !host.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(false);
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      // A full navigation also clears previously cached authenticated page content.
      window.location.replace("/login");
    } catch {
      setLogoutError(true);
      setLoggingOut(false);
    }
  }

  return (
    <div className="settings-menu" ref={host}>
      <button
        ref={trigger}
        type="button"
        className="settings-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <Icon name="settings" size={16} />
        <span>Settings</span>
        <Icon name="chevron" size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
      </button>

      <div id={panelId} className="settings-panel" hidden={!open}>
        <p className="settings-title">Settings</p>

        <div className="settings-row">
          <span className="settings-label">Theme</span>
          <div className="option-group" role="group" aria-label="Theme">
            <button type="button" aria-pressed={theme === "light"} onClick={() => theme !== "light" && toggleTheme()}>
              <Icon name="sun" size={14} />Light
            </button>
            <button type="button" aria-pressed={theme === "dark"} onClick={() => theme !== "dark" && toggleTheme()}>
              <Icon name="moon" size={14} />Dark
            </button>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Text size</span>
          <div className="option-group" role="group" aria-label="Text size">
            {ZOOM_OPTIONS.map((option) => (
              <button key={option.value} type="button" aria-pressed={zoomMode === option.value} onClick={() => setZoomMode(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Animations</span>
          <div className="option-group" role="group" aria-label="Animations">
            <button type="button" aria-pressed={motionOn} disabled={motionReduced} onClick={() => !motionOn && toggleMotion()}>On</button>
            <button type="button" aria-pressed={!motionOn} disabled={motionReduced} onClick={() => motionOn && toggleMotion()}>Off</button>
          </div>
        </div>
        {motionReduced && <p className="settings-note">Your system is set to reduced motion, so animations stay off.</p>}

        <button type="button" className="settings-logout" onClick={logout} disabled={loggingOut}>
          <Icon name="logout" size={15} />
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
        {logoutError && <p className="settings-note settings-error" role="alert">Could not log out. Please try again.</p>}
      </div>
    </div>
  );
}
