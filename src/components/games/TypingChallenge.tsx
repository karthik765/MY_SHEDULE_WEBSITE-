"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

// Keyed by game id so the same engine can power themed "packs" that unlock
// on their own weekly schedule — a different sentence list, not a different game.
export const TYPING_PACKS: Record<string, Record<Difficulty, string[]>> = {
  "typing-challenge": {
    easy: ["The cat sat on the mat.", "I like to read books.", "The sun is bright today."],
    medium: [
      "The quick brown fox jumps over the lazy dog.",
      "Practice makes progress, not perfection.",
      "She sells seashells by the seashore.",
    ],
    hard: [
      "Success isn't always about greatness; it's about consistency.",
      "Whether you think you can, or you think you can't, you're right.",
      "The only way to do great work is to love what you do.",
    ],
  },
  "typing-quotes": {
    easy: ["Be yourself. Everyone else is taken.", "Simplicity is the ultimate sophistication."],
    medium: [
      "The best way to predict the future is to create it.",
      "In the middle of difficulty lies opportunity.",
    ],
    hard: [
      "Twenty years from now you will be more disappointed by the things you didn't do than by the ones you did.",
      "It does not matter how slowly you go as long as you do not stop.",
    ],
  },
  "typing-tongue-twisters": {
    easy: ["She sells seashells.", "Red lorry, yellow lorry."],
    medium: ["Peter Piper picked a peck of pickled peppers.", "How much wood would a woodchuck chuck?"],
    hard: [
      "Betty Botter bought some butter, but she said the butter's bitter.",
      "Fuzzy Wuzzy was a bear, Fuzzy Wuzzy had no hair.",
    ],
  },
  "typing-proverbs": {
    easy: ["Actions speak louder than words.", "Better late than never."],
    medium: ["A journey of a thousand miles begins with a single step.", "The early bird catches the worm."],
    hard: [
      "Don't count your chickens before they hatch, because plans can always change.",
      "A bird in the hand is worth two in the bush, so value what you already have.",
    ],
  },
  "typing-movie-lines": {
    easy: ["May the odds be ever in your favor.", "Life is like a box of chocolates."],
    medium: ["I feel the need, the need for speed.", "Houston, we have a problem here today."],
    hard: [
      "With great power comes great responsibility, whether you asked for it or not.",
      "Every man dies, but not every man really lives a life worth remembering.",
    ],
  },
  "typing-idioms": {
    easy: ["It's raining cats and dogs.", "Break a leg out there."],
    medium: ["Don't cry over spilled milk, it's already done.", "The ball is in your court now."],
    hard: [
      "Every cloud has a silver lining if you're willing to look for it.",
      "Don't judge a book by its cover, you might be surprised inside.",
    ],
  },
  "typing-facts": {
    easy: ["Honey never spoils if stored well.", "Octopuses have three hearts."],
    medium: ["Bananas are botanically classified as berries.", "A day on Venus is longer than its year."],
    hard: [
      "Sharks existed on Earth before trees first appeared, which is a wild thought.",
      "The Great Wall of China is not actually visible from space with the naked eye.",
    ],
  },
  "typing-famous-speeches": {
    easy: ["I have a dream today.", "Ask not what your country can do."],
    medium: ["We choose to go to the moon in this decade.", "Government of the people, by the people."],
    hard: [
      "Four score and seven years ago our fathers brought forth a new nation.",
      "We shall fight on the beaches, we shall fight on the landing grounds.",
    ],
  },
};

const TIME_LIMIT: Record<Difficulty, number> = { easy: 25, medium: 20, hard: 18 };

export default function TypingChallenge({
  gameId,
  difficulty,
  onEnd,
}: {
  gameId: string;
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const sentencePack = TYPING_PACKS[gameId] ?? TYPING_PACKS["typing-challenge"];
  const [sentence, setSentence] = useState("");
  const [input, setInput] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const [status, setStatus] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const reportedRef = useRef(false);

  useEffect(() => {
    if (status !== "playing" || secondsLeft <= 0) return;
    const tick = setTimeout(() => {
      setSecondsLeft((s) => {
        const next = s - 1;
        if (next <= 0 && !reportedRef.current) {
          reportedRef.current = true;
          setStatus("lost");
          onEnd("lost");
        }
        return next;
      });
    }, 1000);
    return () => clearTimeout(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [secondsLeft, status]);

  function start() {
    const pool = sentencePack[difficulty];
    setSentence(pool[Math.floor(Math.random() * pool.length)]);
    setInput("");
    setSecondsLeft(TIME_LIMIT[difficulty]);
    reportedRef.current = false;
    setStatus("playing");
  }

  function handleChange(value: string) {
    if (status !== "playing") return;
    setInput(value);
    if (value === sentence && !reportedRef.current) {
      reportedRef.current = true;
      setStatus("won");
      onEnd("won");
    }
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Type the sentence exactly before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Time left: ${secondsLeft}s`}
        {status === "won" && "Nailed it! 🎉"}
        {status === "lost" && "Time's up!"}
      </p>
      {status === "playing" && (
        <>
          <p className="max-w-md text-center text-sm font-bold">{sentence}</p>
          <textarea
            autoFocus
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            className="comic-input w-full max-w-md px-3 py-2 text-sm"
            rows={2}
          />
        </>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
