"use client";

import { useEffect } from "react";

export default function AndroidShellMarker() {
  useEffect(() => {
    const isAndroidShell =
      /Android/i.test(navigator.userAgent) &&
      (/; wv\)/i.test(navigator.userAgent) || "Capacitor" in window);

    if (isAndroidShell) {
      document.documentElement.dataset.androidShell = "true";
    } else {
      delete document.documentElement.dataset.androidShell;
    }

    return () => {
      delete document.documentElement.dataset.androidShell;
    };
  }, []);

  return null;
}
