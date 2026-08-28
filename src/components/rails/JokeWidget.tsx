"use client";

import { useState } from "react";
import { JOKES } from "@/lib/rail-content";

export default function JokeWidget() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  function next() {
    setRevealed(false);
    setIndex((i) => (i + 1) % JOKES.length);
  }

  const [setup, punchline] = JOKES[index];

  return (
    <div className="rail-panel widget-panel">
      <div className="rail-panel-label">
        <span>SIGNAL // COMIC RELIEF</span>
      </div>
      <p className="widget-joke-setup">{setup}</p>
      {revealed ? (
        <p className="widget-joke-punchline">{punchline}</p>
      ) : (
        <button type="button" onClick={() => setRevealed(true)} className="comic-btn px-3 py-1 text-xs self-start">
          Reveal
        </button>
      )}
      {revealed && (
        <button type="button" onClick={next} className="comic-btn px-3 py-1 text-xs self-start">
          Next →
        </button>
      )}
    </div>
  );
}
