import type { Metadata } from "next";
import { DM_Sans, Manrope, IBM_Plex_Mono, Barlow_Condensed } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./observatory.css";
import "./chapters.css";
import StudioShell from "@/components/studio/StudioShell";

const display = Barlow_Condensed({ weight: ["400", "500", "600", "700"], variable: "--font-display", subsets: ["latin"], display: "swap" });
const heading = Manrope({ variable: "--font-comic-heading", subsets: ["latin"], display: "swap" });
const body = DM_Sans({ variable: "--font-comic-body", subsets: ["latin"], display: "swap" });
const mono = IBM_Plex_Mono({ weight: ["400", "500"], variable: "--font-comic-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Make It Count | Personal Space",
  description: "Your attention is your most valuable asset. Focus, plan, and build your next chapter.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("observatory-theme");
    document.documentElement.dataset.theme = stored === "light" ? "light" : "dark";
    document.documentElement.dataset.motion = localStorage.getItem("cinematic-motion") === "off" ? "off" : "on";
    var zoom = localStorage.getItem("zoom-mode");
    if (zoom === "minimize" || zoom === "maximize") document.documentElement.dataset.zoom = zoom;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${display.variable} ${heading.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full min-w-0 text-ink">
        <Script id="theme-init" strategy="beforeInteractive">{THEME_INIT_SCRIPT}</Script>
        <StudioShell>{children}</StudioShell>
      </body>
    </html>
  );
}
