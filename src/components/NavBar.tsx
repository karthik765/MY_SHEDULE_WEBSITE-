"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", color: "var(--comic-blue)" },
  { href: "/schedule", label: "Schedule", color: "var(--comic-purple)" },
  { href: "/tasks", label: "Tasks", color: "var(--comic-red)" },
  { href: "/timer", label: "Timer", color: "var(--comic-orange)" },
  { href: "/habits", label: "Habits", color: "var(--comic-green)" },
  { href: "/journal", label: "Journal", color: "var(--comic-pink)" },
  { href: "/goals", label: "Goals", color: "var(--comic-yellow)" },
  { href: "/analytics", label: "Analytics", color: "var(--comic-blue)" },
];

export default function NavBar() {
  const pathname = usePathname();

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
              className="comic-btn px-3 py-1.5 text-sm"
              style={{
                backgroundColor: active ? link.color : "var(--panel)",
                boxShadow: active ? "3px 3px 0 0 var(--ink)" : "2px 2px 0 0 var(--ink)",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
