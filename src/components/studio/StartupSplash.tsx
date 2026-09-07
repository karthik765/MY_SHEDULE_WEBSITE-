"use client";

import { useEffect, useState } from "react";

export default function StartupSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isAndroidShell = /Android/i.test(navigator.userAgent) &&
      (/; wv\)/i.test(navigator.userAgent) || "Capacitor" in window);
    if (!isAndroidShell || sessionStorage.getItem("make-it-count-started")) return;
    sessionStorage.setItem("make-it-count-started", "1");
    const show = window.setTimeout(() => setVisible(true), 0);
    const timer = window.setTimeout(() => setVisible(false), 2400);
    return () => { window.clearTimeout(show); window.clearTimeout(timer); };
  }, []);

  if (!visible) return null;
  return <div className="startup-splash" role="status" aria-label="K Productions loading">
    <div className="startup-mark">K</div>
    <p>K PRODUCTIONS</p>
    <span>MAKE IT COUNT</span>
  </div>;
}
