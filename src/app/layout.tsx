import type { Metadata } from "next";
import { Orbitron, Rajdhani, Share_Tech_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import NavBar from "@/components/NavBar";

// Variable names kept as --font-comic-heading/--font-comic-body (rather than
// renamed) so every page's existing font-heading/font-sans utility classes
// keep working unchanged — only the actual typefaces changed here.
const comicHeading = Orbitron({
  weight: ["700", "800", "900"],
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
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme-init script below sets data-theme on this element before React
      // hydrates, based on localStorage — an intentional, controlled mismatch.
      suppressHydrationWarning
      className={`${comicHeading.variable} ${comicBody.variable} ${comicMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-ink">
        {/* beforeInteractive runs before hydration, avoiding a flash of the wrong theme */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <NavBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
