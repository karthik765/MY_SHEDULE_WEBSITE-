import { notFound } from "next/navigation";
import DemoTour from "@/components/demo/DemoTour";
import { DEMO_SECTIONS } from "@/lib/demo";
import { MINIGAMES, PUZZLES, RIDDLES, IQ_GAMES, QMASTER_GAMES } from "@/lib/games";

export const metadata = { title: "Beta Demo | Make It Count", description: "Explore a read-only, empty preview. No account required." };

export default async function DemoPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  const section = DEMO_SECTIONS.find(item => item.id === (slug[0] ?? "overview"));
  if (!section || slug.length > 1) notFound();
  // This route deliberately does not read cookies, account APIs, or the database.
  const games = section.id === "minigames" ? [...MINIGAMES, ...PUZZLES, ...RIDDLES, ...IQ_GAMES, ...QMASTER_GAMES].map(({ id, title, kind, description }) => ({ id, title, kind, description })) : [];
  return <DemoTour key={section.id} section={section} games={games} />;
}
