"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { findGameDef, type AnswerDef } from "@/lib/games";
import TicTacToe from "@/components/games/TicTacToe";
import Snake from "@/components/games/Snake";
import Memory from "@/components/games/Memory";
import Merge2048 from "@/components/games/Merge2048";
import Chess from "@/components/games/Chess";
import AnswerGame from "@/components/games/AnswerGame";

interface GameRecordRow {
  game: string;
  solved: boolean;
}

export default function GameDetailPage() {
  const params = useParams<{ slug: string }>();
  const def = findGameDef(params.slug);
  const [alreadySolved, setAlreadySolved] = useState(false);
  const [reward, setReward] = useState<number | null>(null);

  useEffect(() => {
    if (!def || def.kind === "minigame") return;
    fetch("/api/games")
      .then((r) => r.json())
      .then((records: GameRecordRow[]) => {
        setAlreadySolved(records.find((r) => r.game === def.id)?.solved ?? false);
      });
  }, [def]);

  async function complete(score?: number) {
    if (!def) return;
    const res = await fetch("/api/games/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: def.id, score }),
    });
    const data = await res.json();
    setReward(data.awardedMinutes);
  }

  if (!def) {
    return (
      <div className="comic-panel p-6 text-center">
        <p className="font-bold">Game not found.</p>
        <Link href="/minigames" className="comic-btn mt-3 inline-block bg-comic-blue px-4 py-2 text-chip-ink">
          Back to Minigames
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-comic-pink" style={{ WebkitTextStroke: "1px var(--ink)" }}>
          {def.emoji} {def.title}
        </h1>
        <Link href="/minigames" className="comic-btn bg-panel px-3 py-1.5 text-sm">
          ← Back
        </Link>
      </div>

      {reward !== null && (
        <div className="comic-panel-sm bg-comic-yellow p-3 text-center text-chip-ink">
          <p className="text-sm font-bold">
            {reward > 0
              ? `🎉 +${reward} min of focus time added to your Timer stats!`
              : "Nice work — no bonus this time (already solved, or today's reward limit for this game is used up)."}
          </p>
        </div>
      )}

      {def.id === "tic-tac-toe" && <TicTacToe onWin={() => complete()} />}
      {def.id === "snake" && <Snake onWin={(score) => complete(score)} />}
      {def.id === "memory" && <Memory onWin={() => complete()} />}
      {def.id === "2048" && <Merge2048 onWin={(score) => complete(score)} />}
      {def.id === "chess" && <Chess onWin={() => complete()} />}
      {(def.kind === "puzzle" || def.kind === "riddle") && (
        <AnswerGame def={def as AnswerDef} alreadySolved={alreadySolved} onSolved={() => complete()} />
      )}
    </div>
  );
}
