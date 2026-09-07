"use client";

import { useEffect, useRef, useState } from "react";
import { playSoundCue } from "@/lib/sound";

export default function StartupSplash() {
  const [visible, setVisible] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const isAndroidShell = /Android/i.test(navigator.userAgent) &&
      (/; wv\)/i.test(navigator.userAgent) || "Capacitor" in window);
    if (!isAndroidShell || sessionStorage.getItem("make-it-count-started")) return;
    sessionStorage.setItem("make-it-count-started", "1");
    const show = window.setTimeout(() => setVisible(true), 0);
    const unlockIntro = () => {
      playSoundCue(audioCtxRef, "intro");
      window.removeEventListener("pointerdown", unlockIntro);
      window.removeEventListener("keydown", unlockIntro);
    };
    window.addEventListener("pointerdown", unlockIntro, { once: true });
    window.addEventListener("keydown", unlockIntro, { once: true });
    const timer = window.setTimeout(() => setVisible(false), 2400);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", unlockIntro);
      window.removeEventListener("keydown", unlockIntro);
    };
  }, []);

  if (!visible) return null;
  return <div className="startup-splash" role="status" aria-label="K Productions loading">
    <div className="startup-mark">K</div>
    <p>K PRODUCTIONS</p>
    <span>MAKE IT COUNT</span>
  </div>;
}
