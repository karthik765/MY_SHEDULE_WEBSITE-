"use client";

import { useState, type FormEvent } from "react";
import { isCorrectAnswer, REPLAY_REWARD_PCT, type AnswerDef } from "@/lib/games";

export default function AnswerGame({
  def,
  alreadySolved,
  onSolved,
}: {
  def: AnswerDef;
  alreadySolved: boolean;
  onSolved: () => void;
}) {
  const [guess, setGuess] = useState("");
  // Always starts idle, even when alreadySolved — that flag now only means
  // "replaying via the Completed tab, pays a reduced reward", not "block input".
  const [status, setStatus] = useState<"idle" | "wrong" | "correct">("idle");
  const [attempts, setAttempts] = useState(0);
  const replayPct = Math.round(REPLAY_REWARD_PCT[def.difficulty] * 100);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!guess.trim() || status === "correct") return;
    if (isCorrectAnswer(def, guess)) {
      setStatus("correct");
      onSolved();
    } else {
      setStatus("wrong");
      setAttempts((a) => a + 1);
    }
  }

  return (
    <div className="comic-panel space-y-4 p-6">
      <p className="text-lg leading-relaxed">{def.question}</p>

      {alreadySolved && status !== "correct" && (
        <p className="comic-badge inline-block px-2 py-0.5 text-xs text-ink">
          🔁 Replay — already solved, pays {replayPct}% this time
        </p>
      )}

      {status === "correct" ? (
        <div className="comic-panel-sm p-4 text-center text-ink">
          <p className="font-heading text-2xl">Solved! 🎉</p>
          {alreadySolved && (
            <p className="mt-1 text-xs font-bold text-ink/80">
              Already solved before — {replayPct}% focus time this time, but great job.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            autoFocus
            className="comic-input flex-1 px-3 py-2"
            placeholder="Your answer..."
            value={guess}
            onChange={(e) => {
              setGuess(e.target.value);
              if (status === "wrong") setStatus("idle");
            }}
          />
          <button type="submit" className="comic-btn px-6 py-2 text-ink">
            Submit
          </button>
        </form>
      )}

      {status === "wrong" && (
        <p className="text-sm font-bold text-comic-red">
          Not quite — try again{attempts >= 3 ? ". Think about it from a different angle." : "."}
        </p>
      )}
    </div>
  );
}
