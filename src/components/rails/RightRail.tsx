import QuoteWidget from "./QuoteWidget";
import JokeWidget from "./JokeWidget";
import PuzzleWidget from "./PuzzleWidget";

export default function RightRail() {
  return (
    <aside className="hidden lg:flex lg:flex-col gap-4">
      <QuoteWidget />
      <JokeWidget />
      <PuzzleWidget />
    </aside>
  );
}
