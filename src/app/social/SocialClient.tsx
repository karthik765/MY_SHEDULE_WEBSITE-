"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SocialState {
  budgetSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
  active: { id: string; platform: "x" | "instagram"; url: string; openedAt: string } | null;
}

const PLATFORM_META: Record<"x" | "instagram", { label: string; emoji: string; color: string }> = {
  x: { label: "X", emoji: "𝕏", color: "var(--comic-blue)" },
  instagram: { label: "Instagram", emoji: "📸", color: "var(--comic-purple)" },
};

function fmt(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function SocialClient() {
  const [state, setState] = useState<SocialState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Live client-side countdown so the number ticks every second between
  // server syncs. Seeded from the server's remaining time.
  const [liveRemaining, setLiveRemaining] = useState<number | null>(null);
  const anchorRef = useRef<{ remaining: number; at: number } | null>(null);

  const applyState = useCallback((next: SocialState) => {
    setState(next);
    if (next.active) {
      anchorRef.current = { remaining: next.remainingSeconds, at: Date.now() };
      setLiveRemaining(next.remainingSeconds);
    } else {
      anchorRef.current = null;
      setLiveRemaining(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/social", { cache: "no-store" });
    if (res.ok) applyState(await res.json());
  }, [applyState]);

  useEffect(() => {
    // Deferred a tick so the setState lands after mount, syncing from an
    // external system (the API) rather than synchronously in the effect
    // body — same pattern as NavBar.tsx / minigames.
    (async () => {
      await Promise.resolve();
      await refresh();
    })();
  }, [refresh]);

  // 1s local tick while a session is open.
  useEffect(() => {
    if (!state?.active) return;
    const id = setInterval(() => {
      const a = anchorRef.current;
      if (!a) return;
      const elapsed = (Date.now() - a.at) / 1000;
      setLiveRemaining(Math.max(0, a.remaining - elapsed));
    }, 1000);
    return () => clearInterval(id);
  }, [state?.active]);

  // Heartbeat: persist accrued time every 15s; end the session when the
  // budget hits zero.
  useEffect(() => {
    if (!state?.active) return;
    const id = setInterval(async () => {
      const done = (liveRemaining ?? 1) <= 0;
      const res = await fetch("/api/social/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end: done }),
      });
      if (res.ok) applyState(await res.json());
    }, 15000);
    return () => clearInterval(id);
  }, [state?.active, liveRemaining, applyState]);

  // If we're the tab being closed, flush the elapsed time (not as "end" —
  // the timer keeps running until Done or the budget runs out).
  useEffect(() => {
    if (!state?.active) return;
    const flush = () => {
      navigator.sendBeacon?.(
        "/api/social/sync",
        new Blob([JSON.stringify({ end: false })], { type: "application/json" })
      );
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [state?.active]);

  async function open(platform: "x" | "instagram") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/social/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not open right now.");
        if (data.state) applyState(data.state);
        return;
      }
      applyState(data.state);
      window.open(data.url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      const res = await fetch("/api/social/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end: true }),
      });
      if (res.ok) applyState(await res.json());
    } finally {
      setBusy(false);
    }
  }

  const remaining = liveRemaining ?? state?.remainingSeconds ?? 0;
  const outOfTime = state != null && remaining <= 0;
  const active = state?.active ?? null;

  return (
    <div className="space-y-6">
      <h1
        className="font-heading text-4xl text-comic-purple"
        style={{ WebkitTextStroke: "1.5px var(--ink)" }}
      >
        Social
      </h1>
      <p className="text-sm text-ink/60">
        15 minutes a day, combined across X and Instagram. Pick one below to open it in a new
        tab — you&apos;re already logged in there. The timer keeps counting until you press{" "}
        <span className="font-bold">I&apos;m done</span> or the 15 minutes run out, then both
        links lock until tomorrow.
      </p>

      {state && (
        <div className="comic-panel p-4 text-ink">
          <p className="text-xs font-bold tracking-wide text-comic-orange uppercase">
            Time left today
          </p>
          <p className="font-heading text-4xl" style={{ color: outOfTime ? "var(--comic-red)" : "var(--comic-green)" }}>
            {fmt(remaining)}
          </p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-panel">
            <div
              className="h-full bg-comic-green transition-all"
              style={{
                width: `${(remaining / state.budgetSeconds) * 100}%`,
                background: outOfTime ? "var(--comic-red)" : "var(--comic-green)",
              }}
            />
          </div>
          {active && (
            <p className="mt-2 text-sm font-bold">
              {PLATFORM_META[active.platform].emoji} {PLATFORM_META[active.platform].label} is
              open — timer running.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="comic-panel-sm p-3 text-sm font-bold text-comic-red">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(["x", "instagram"] as const).map((p) => {
          const meta = PLATFORM_META[p];
          const isActive = active?.platform === p;
          const disabled = busy || outOfTime || (active != null && !isActive);
          return (
            <div key={p} className="comic-panel flex flex-col items-center gap-3 p-6 text-ink">
              <span className="text-5xl">{meta.emoji}</span>
              <span className="font-heading text-2xl" style={{ color: meta.color }}>
                {meta.label}
              </span>
              {isActive ? (
                <>
                  <button
                    onClick={() => window.open(active!.url, "_blank", "noopener")}
                    className="comic-btn w-full bg-panel px-4 py-2 text-sm text-ink"
                  >
                    Reopen tab
                  </button>
                  <button
                    onClick={finish}
                    disabled={busy}
                    className="comic-btn w-full px-4 py-2 text-sm"
                    style={{ boxShadow: "2px 2px 0 0 var(--ink)" }}
                  >
                    I&apos;m done
                  </button>
                </>
              ) : (
                <button
                  onClick={() => open(p)}
                  disabled={disabled}
                  className="comic-btn w-full px-4 py-2 text-sm disabled:opacity-40"
                  style={{ boxShadow: "2px 2px 0 0 var(--ink)" }}
                >
                  {outOfTime ? "Locked until tomorrow" : `Open ${meta.label}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
