"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import NavBar from "@/components/NavBar";
import ThemeToggle from "@/components/ThemeToggle";
import QuoteWidget from "@/components/rails/QuoteWidget";
import JokeWidget from "@/components/rails/JokeWidget";
import PuzzleWidget from "@/components/rails/PuzzleWidget";
import Atmosphere from "./Atmosphere";
import BrandMark from "./BrandMark";

const SECTIONS = [{ href: "/", title: "Overview" }, { href: "/focus", title: "Focus" }, { href: "/schedule", title: "Schedule" }, { href: "/habits", title: "Habits" }, { href: "/goals", title: "Goals" }, { href: "/topics", title: "Learning" }, { href: "/minigames", title: "Play" }, { href: "/analytics", title: "Analytics" }];

export default function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <><Atmosphere /><div className="login-theme"><ThemeToggle /></div><main className="login-shell">{children}</main></>;
  return (
    <div className="studio-shell">
      <Atmosphere />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <NavBar />
      <div className="studio-workspace">
        <div className="workspace-bar"><span>YOUR SPACE <span className="workspace-divider">/</span> <strong>{pathname === "/" ? "OVERVIEW" : pathname.split("/")[1].replaceAll("-", " ").toUpperCase()}</strong></span><div className="workspace-tools"><span className="workspace-status"><i />MAKE IT COUNT</span><ThemeToggle /><BrandMark compact /></div></div>
        <main id="main-content" tabIndex={-1} className="studio-main"><div key={pathname} className="page-enter">{children}</div></main>
        <details className="studio-break">
          <summary><span>A moment to reset</span><span>Quotes, a little humor & a daily puzzle <b>+</b></span></summary>
          <div className="studio-widgets"><QuoteWidget /><JokeWidget /><PuzzleWidget /></div>
        </details>
        <footer className="studio-footer"><span>MAKE IT COUNT <span>/</span> PERSONAL SPACE</span><span>Built around your potential.</span></footer>
      </div>
      <nav className="section-nav" aria-label="Quick section navigation">{SECTIONS.map((section, i) => <Link key={section.href} href={section.href} aria-current={pathname === section.href ? "page" : undefined}><span /><small>{String(i + 1).padStart(2, "0")}</small><b>{section.title}</b></Link>)}</nav>
    </div>
  );
}
