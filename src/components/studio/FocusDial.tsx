"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";

export default function FocusDial({ startedAt: initialStart, initialNow }: { startedAt: string | null; initialNow: string }) {
  const [currentStart, setCurrentStart] = useState(initialStart);
  const [syncFailed, setSyncFailed] = useState(false);
  const [now, setNow] = useState(() => Date.parse(initialNow));
  useEffect(() => {
    let disposed = false;
    const sync = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/timer/active", { cache: "no-store" });
        if (!response.ok) throw new Error("Timer sync failed");
        const session = await response.json();
        if (!disposed) { setCurrentStart(session?.endTime == null ? session?.startTime ?? null : null); setSyncFailed(false); }
      } catch { if (!disposed) setSyncFailed(true); }
    };
    void sync();
    const interval = setInterval(sync, 10000);
    document.addEventListener("studio:timer-changed", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => { disposed = true; clearInterval(interval); document.removeEventListener("studio:timer-changed", sync); document.removeEventListener("visibilitychange", sync); window.removeEventListener("focus", sync); };
  }, []);
  const startedAt = currentStart;
  useEffect(() => {
    if (!startedAt) return;
    const interval = window.setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);
  const seconds = startedAt ? Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000)) : 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const clock = startedAt ? [hours || null, minutes, seconds % 60].filter(v => v !== null).map(v => String(v).padStart(2, "0")).join(":") : "READY";
  return <Link href="/focus" className="focus-dial" aria-label={startedAt ? "Return to your running focus session" : "Set up a focus session"}>
    <svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="85" /><circle className="dial-tracer" cx="90" cy="90" r="85" /></svg>
    <span className="dial-label">{startedAt ? "IN YOUR ELEMENT" : "YOUR NEXT CHAPTER"}</span>
    <strong className={clock.length > 5 ? "dial-long" : ""}>{syncFailed ? "SYNC" : clock}</strong><span className="dial-mode">{syncFailed ? "CHECK CONNECTION" : startedAt ? "OPEN TIMER / REVIEW" : "ENTER FOCUS"}</span>
    <span className="dial-arrow"><Icon name="arrow" size={15} /></span>
  </Link>;
}
