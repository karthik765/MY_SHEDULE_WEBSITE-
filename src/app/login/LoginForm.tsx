"use client";

import { useState, type FormEvent } from "react";
import Sculpture from "@/components/studio/Sculpture";
import Icon from "@/components/studio/Icon";
import BrandMark from "@/components/studio/BrandMark";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const GOOGLE_MESSAGES: Record<string, string> = {
  setup: "Google login needs the Google client id and secret before it can open.",
  failed: "Google login did not finish. Try again.",
  denied: "That Google account is not allowed for this space.",
};

export default function LoginForm({ emailOnly = false, initialEmail = "" }: { emailOnly?: boolean; initialEmail?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleMessage = GOOGLE_MESSAGES[searchParams.get("google") ?? ""] ?? null;
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(emailOnly);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailOnly ? { email } : { email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-studio">
      <section className="login-intro">
        <div className="studio-brand"><BrandMark /><span className="brand-caption">PERSONAL SPACE</span></div>
        <div className="login-art"><Sculpture /></div>
        <h2>MAKE TIME.<br /><em>MAKE IT COUNT.</em></h2>
        <p>Your attention is your most valuable asset.</p>
      </section>
      <section className="login-form" aria-label="Sign in">
        <header><p className="eyebrow"><span />YOUR PERSONAL SPACE <strong className="beta-badge">BETA</strong></p><h1>WELCOME BACK.</h1><p>Settle in. Your next chapter is waiting.</p><p className="beta-note">Currently in beta. Features are still being built and refined.</p></header>

        <a href="/api/login/google" className="google-action"><span aria-hidden="true">G</span>Continue with Google<Icon name="arrow" size={16} /></a>
        {googleMessage && <p role="alert" className="login-message">{googleMessage}</p>}

        <div className="login-demo"><Link href="/demo" className="demo-entry">Explore Demo <Icon name="arrow" size={16} /></Link><p>No login needed. Browse an empty, read-only preview. Nothing can be added, played, or saved.</p></div>

        {!showPasswordLogin && !emailOnly && <button type="button" className="login-secondary" onClick={() => setShowPasswordLogin(true)}>Use email instead</button>}

        {showPasswordLogin && (
          <form onSubmit={handleSubmit} className="password-login">
            {!emailOnly && <div className="login-field"><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="username" required className="comic-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus /></div>}
            {!emailOnly && <div className="login-field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" required className="comic-input" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} /></div>}
            {error && <p role="alert" className="text-sm text-comic-red">{error}</p>}
            <button type="submit" disabled={loading} className="primary-action">{loading ? "Opening your studio..." : "Enter with email"}<Icon name="arrow" size={16} /></button>
          </form>
        )}
        <p className="login-note">{emailOnly ? "Local preview: just click to enter. No email or password needed." : "A little better, every day."}</p>
      </section>
    </div>
  );
}