"use client";

import { useState } from "react";

const MAX_GUESSES = 6;
const RANGE = 50;

function newTarget() {
  return 1 + Math.floor(Math.random() * RANGE);
}

type Status = "playing" | "won" | "lost";

export default function PuzzleWidget() {
  const [target, setTarget] = useState(newTarget);
  const [guess, setGuess] = useState("");
  const [history, setHistory] = useState<{ value: number; hint: "high" | "low" }[]>([]);
  const [status, setStatus] = useState<Status>("playing");

  function reset() {
    setTarget(newTarget());
    setGuess("");
    setHistory([]);
    setStatus("playing");
  }

  function submitGuess(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(guess);
    if (!Number.isInteger(n) || n < 1 || n > RANGE || status !== "playing") return;

    if (n === target) {
      setStatus("won");
    } else {
      const hint: "low" | "high" = n < target ? "low" : "high";
      const nextHistory = [...history, { value: n, hint }];
      setHistory(nextHistory);
      if (nextHistory.length >= MAX_GUESSES) setStatus("lost");
    }
    setGuess("");
  }

  const guessesLeft = MAX_GUESSES - history.length;

  return (
    <div className="rail-panel widget-panel">
      <div className="rail-panel-label">
        <span>SIGNAL // DECODE</span>
      </div>
      <p className="widget-puzzle-intro">
        Pick a number, 1–{RANGE}. {guessesLeft} {guessesLeft === 1 ? "guess" : "guesses"} left.
      </p>

      {status === "playing" && (
        <form onSubmit={submitGuess} className="widget-puzzle-form">
          <input
            type="number"
            min={1}
            max={RANGE}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="comic-input widget-puzzle-input"
            placeholder="?"
          />
          <button type="submit" className="comic-btn px-3 py-1 text-xs self-start">
            Send
          </button>
        </form>
      )}

      {history.length > 0 && (
        <ul className="widget-puzzle-history">
          {history.map((h, i) => (
            <li key={i}>
              {h.value} → {h.hint === "high" ? "too high" : "too low"}
            </li>
          ))}
        </ul>
      )}

      {status === "won" && <p className="widget-puzzle-result won">Decoded in {history.length + 1}. Signal clear.</p>}
      {status === "lost" && (
        <p className="widget-puzzle-result lost">Signal lost. It was {target}.</p>
      )}
      {status !== "playing" && (
        <button type="button" onClick={reset} className="comic-btn px-3 py-1 text-xs self-start">
          New signal →
        </button>
      )}
    </div>
  );
}
