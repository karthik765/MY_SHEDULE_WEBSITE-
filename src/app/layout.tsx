import type { Metadata } from "next";
import { Bangers, Comic_Neue } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import NavBar from "@/components/NavBar";

const comicHeading = Bangers({
  weight: "400",
  variable: "--font-comic-heading",
  subsets: ["latin"],
});

const comicBody = Comic_Neue({
  weight: ["400", "700"],
  variable: "--font-comic-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life Dashboard",
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
      className={`${comicHeading.variable} ${comicBody.variable} h-full antialiased`}
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
