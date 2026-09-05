"use client";

import { useState } from "react";
import Icon from "./Icon";

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      // A full navigation also clears previously cached authenticated page content.
      window.location.replace("/login");
    } catch {
      setError(true);
      setBusy(false);
    }
  }
  return <div className="logout-control"><button type="button" className="logout-button" onClick={logout} disabled={busy}><Icon name="logout" size={16} /><span>{busy ? "Logging out..." : "Log out"}</span></button>{error && <p role="alert">Could not log out. Please try again.</p>}</div>;
}
