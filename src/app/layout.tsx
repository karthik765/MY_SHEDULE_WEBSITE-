import type { Metadata } from "next";
import { Chakra_Petch, Rajdhani, Share_Tech_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import NavBar from "@/components/NavBar";
import LeftRail from "@/components/rails/LeftRail";
import RightRail from "@/components/rails/RightRail";
import MobileStrip from "@/components/rails/MobileStrip";
import AmbientEffects from "@/components/effects/AmbientEffects";

// Variable names kept as --font-comic-heading/--font-comic-body (rather than
// renamed) so every page's existing font-heading/font-sans utility classes
// keep working unchanged — only the actual typefaces changed here.
// Was Orbitron — its very rounded, spaced-out letterforms read as an odd
// mismatch against the rest of the site (most visible on "KARTHIK"). Chakra
// Petch is the same angular/technical territory but reads as plain, legible
// letters at a glance, everywhere this font is used (every heading + the
// nav wordmark).
const comicHeading = Chakra_Petch({
  weight: ["600", "700"],
  variable: "--font-comic-heading",
  subsets: ["latin"],
});

const comicBody = Rajdhani({
  weight: ["500", "600", "700"],
  variable: "--font-comic-body",
  subsets: ["latin"],
});

const comicMono = Share_Tech_Mono({
  weight: "400",
  variable: "--font-comic-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Karthik",
  description: "Personal schedule, tasks, timer, habits, journal and goals",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.dataset.theme = stored;
    }
    var zoom = localStorage.getItem("zoom-mode");
    if (zoom === "minimize" || zoom === "maximize") {
      document.documentElement.dataset.zoom = zoom;
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The init script below sets data-theme/data-zoom on this element
      // before React hydrates, based on localStorage — an intentional,
      // controlled mismatch.
      suppressHydrationWarning
      className={`${comicHeading.variable} ${comicBody.variable} ${comicMono.variable} h-full antialiased`}
    >
      <body className="min-h-full min-w-0 flex flex-col text-ink">
        {/* beforeInteractive runs before hydration, avoiding a flash of the wrong theme */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <AmbientEffects />
        <NavBar />
        <MobileStrip />
        <div className="mx-auto w-full min-w-0 max-w-[1720px] flex-1 px-4 py-6">
          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
            <LeftRail />
            <main className="min-w-0 w-full max-w-5xl mx-auto lg:max-w-none lg:mx-0">{children}</main>
            <RightRail />
          </div>
        </div>
      </body>
    </html>
  );
}
