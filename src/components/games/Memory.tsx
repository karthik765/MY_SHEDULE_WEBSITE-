"use client";

import { useEffect, useRef, useState } from "react";

const EMOJIS = ["🎯", "🚀", "🎨", "🎮", "🧩", "⭐"];

interface CardT {
  id: number;
  emoji: string;
  matched: boolean;
}

function shuffledDeck(): CardT[] {
  const deck = [...EMOJIS, ...EMOJIS].map((emoji, i) => ({ id: i, emoji, matched: false }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function Memory({ onWin }: { onWin: () => void }) {
  const [deck, setDeck] = useState<CardT[]>(() => shuffledDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const reportedRef = useRef(false);

  const allMatched = deck.every((c) => c.matched);

  useEffect(() => {
    if (allMatched && !reportedRef.current) {
      reportedRef.current = true;
      onWin();
    }
  }, [allMatched, onWin]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    const timeout = setTimeout(() => {
      setDeck((prev) => {
        if (prev[a].emoji === prev[b].emoji) {
          return prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c));
        }
        return prev;
      });
      setFlipped([]);
    }, 700);
    return () => clearTimeout(timeout);
  }, [flipped]);

  function flip(i: number) {
    if (flipped.length === 2 || flipped.includes(i) || deck[i].matched) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) setMoves((m) => m + 1);
  }

  function reset() {
    setDeck(shuffledDeck());
    setFlipped([]);
    setMoves(0);
    reportedRef.current = false;
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {allMatched ? `Cleared in ${moves} moves! 🎉` : `Moves: ${moves}`}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {deck.map((card, i) => {
          const shown = card.matched || flipped.includes(i);
          return (
            <button
              key={card.id}
              onClick={() => flip(i)}
              disabled={shown}
              className="comic-panel-sm flex h-16 w-16 items-center justify-center text-2xl sm:h-20 sm:w-20 sm:text-3xl"
              style={{ backgroundColor: card.matched ? "var(--comic-green)" : "var(--panel)" }}
            >
              {shown ? card.emoji : "❓"}
            </button>
          );
        })}
      </div>
      {allMatched && (
        <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
