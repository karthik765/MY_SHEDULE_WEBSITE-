"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AppHeader from "./AppHeader";
import ThemeToggle from "@/components/ThemeToggle";
import QuoteWidget from "@/components/rails/QuoteWidget";
import JokeWidget from "@/components/rails/JokeWidget";
import PuzzleWidget from "@/components/rails/PuzzleWidget";
import Atmosphere from "./Atmosphere";
import StartupSplash from "./StartupSplash";
import AndroidShellMarker from "./AndroidShellMarker";

export default function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shell = <><AndroidShellMarker /><StartupSplash /></>;
  if (pathname === "/demo" || pathname.startsWith("/demo/")) return <>{children}</>;
  if (pathname === "/login") return <>{shell}<Atmosphere /><div className="login-theme"><ThemeToggle /></div><main className="login-shell">{children}</main></>;
  if (pathname === "/privacy-policy") return <>{children}</>;
  return (
    <div className="studio-shell">{shell}
      <Atmosphere />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="studio-workspace">
        <AppHeader />
        <main id="main-content" tabIndex={-1} className="studio-main"><div key={pathname} className="page-enter">{children}</div></main>
        <details className="studio-break">
          <summary><span>A moment to reset</span><span>Quotes, a little humor &amp; a daily puzzle <b>+</b></span></summary>
          <div className="studio-widgets"><QuoteWidget /><JokeWidget /><PuzzleWidget /></div>
        </details>
        <footer className="studio-footer"><span>MAKE IT COUNT <span>/</span> PERSONAL SPACE</span><span>Built around your potential.</span></footer>
      </div>
    </div>
  );
}
