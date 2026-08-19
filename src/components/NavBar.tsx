"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Dashboard", color: "var(--comic-blue)" },
  { href: "/focus", label: "Focus", color: "var(--comic-orange)" },
  { href: "/schedule", label: "Schedule", color: "var(--comic-purple)" },
  { href: "/habits", label: "Habits", color: "var(--comic-green)" },
  { href: "/goals", label: "Goals", color: "var(--comic-yellow)" },
  { href: "/minigames", label: "Minigames", color: "var(--comic-pink)" },
  { href: "/achievements", label: "Achievements", color: "var(--comic-orange)" },
  { href: "/analytics", label: "Analytics", color: "var(--comic-blue)" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b-4 border-ink bg-panel">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
        <span
          className="font-heading mr-2 text-2xl tracking-wide text-comic-red"
          style={{ WebkitTextStroke: "1px var(--ink)" }}
        >
          LIFE HQ
        </span>
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`comic-btn px-3 py-1.5 text-sm ${active ? "text-chip-ink" : ""}`}
              style={{
                backgroundColor: active ? link.color : "var(--panel)",
                boxShadow: active ? "3px 3px 0 0 var(--ink)" : "2px 2px 0 0 var(--ink)",
              }}
            >
              {link.label}
            </Link>
          );
        })}
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="comic-btn px-3 py-1.5 text-sm"
          style={{ boxShadow: "2px 2px 0 0 var(--ink)" }}
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}
