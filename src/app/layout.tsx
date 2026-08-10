import type { Metadata } from "next";
import { Bangers, Comic_Neue } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${comicHeading.variable} ${comicBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-ink">
        <NavBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
