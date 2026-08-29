"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface Ladder {
  chain: string[]; // start...end, each adjacent pair differs by exactly one letter
  timeSec: number;
}

const LADDERS: Record<Difficulty, Ladder> = {
  easy: { chain: ["CAT", "COT", "COG", "DOG"], timeSec: 40 },
  medium: { chain: ["COLD", "CORD", "CARD", "WARD", "WARM"], timeSec: 55 },
  hard: { chain: ["HEAD", "HEAL", "TEAL", "TELL", "TALL", "TAIL"], timeSec: 70 },
};

function oneLetterDiff(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diffs = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diffs++;
  return diffs === 1;
}

export default function WordLadder({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const ladder = LADDERS[difficulty];
  const [status, setStatus] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [current, setCurrent] = useState(ladder.chain[0]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(ladder.timeSec);
  const reportedRef = useRef(false);
  const target = ladder.chain[ladder.chain.length - 1];

  useEffect(() => {
    if (status !== "playing" || secondsLeft <= 0) return;
    const tick = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [status, secondsLeft]);

  useEffect(() => {
    if (status === "playing" && secondsLeft <= 0 && !reportedRef.current) {
      reportedRef.current = true;
      setStatus("lost");
      onEnd("lost");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status, secondsLeft]);

  function start() {
    setCurrent(ladder.chain[0]);
    setInput("");
    setMessage("");
    setSecondsLeft(ladder.timeSec);
    reportedRef.current = false;
    setStatus("playing");
  }

  function submit() {
    if (status !== "playing") return;
    const word = input.trim().toUpperCase();
    setInput("");
    if (!ladder.chain.includes(word)) {
      setMessage("Not a word in this ladder.");
      return;
    }
    if (!oneLetterDiff(current, word)) {
      setMessage("Must change exactly one letter from the current word.");
      return;
    }
    setCurrent(word);
    if (word === target) {
      setStatus("won");
      if (!reportedRef.current) {
        reportedRef.current = true;
        onEnd("won");
      }
    } else {
      setMessage("✓ Good step!");
    }
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" &&
          `Turn ${ladder.chain[0]} into ${target}, changing one letter at a time (${ladder.timeSec}s)`}
        {status === "playing" && `Current word: ${current} — Target: ${target} — ${secondsLeft}s left`}
        {status === "won" && "You built the ladder! 🎉"}
        {status === "lost" && `Time's up — you reached ${current}`}
      </p>
      {status === "playing" && (
        <>
          <div className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="comic-input px-3 py-2 text-center text-lg uppercase"
              placeholder="Next word"
            />
            <button onClick={submit} className="comic-btn px-5 py-2 text-ink">
              Submit
            </button>
          </div>
          {message && <p className="text-xs font-bold text-ink/60">{message}</p>}
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
