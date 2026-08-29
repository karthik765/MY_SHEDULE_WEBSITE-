"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={handleSubmit} className="comic-panel w-full max-w-sm space-y-4 bg-panel p-8">
        <h1
          className="font-heading text-3xl text-comic-blue"
          style={{ WebkitTextStroke: "1px var(--ink)" }}
        >
          Sign In
        </h1>
        <div className="space-y-1">
          <label className="text-sm font-bold text-ink/70">Email</label>
          <input
            type="email"
            className="comic-input w-full px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-ink/70">Password</label>
          <input
            type="password"
            className="comic-input w-full px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm font-bold text-comic-red">{error}</p>}
        <button type="submit" disabled={loading} className="comic-btn w-full px-3 py-2 text-ink">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
