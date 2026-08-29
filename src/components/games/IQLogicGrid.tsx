"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

const PEOPLE = ["Ana", "Ben", "Cleo"];
const COLORS = ["Red", "Blue", "Green"];
const PETS = ["Cat", "Dog", "Bird"];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function permutationsOf3<T>(arr: [T, T, T]): T[][] {
  const [a, b, c] = arr;
  return [
    [a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a],
  ];
}

interface Candidate {
  colors: string[];
  pets: string[];
}

interface Clue {
  text: string;
  test: (c: Candidate) => boolean;
  kind: "direct" | "negative" | "link";
}

function buildRound(level: number) {
  const colorPerm = shuffled(COLORS);
  const petPerm = shuffled(PETS);

  const allColorPerms = permutationsOf3(COLORS as [string, string, string]);
  const allPetPerms = permutationsOf3(PETS as [string, string, string]);
  const allCandidates: Candidate[] = [];
  for (const cp of allColorPerms) for (const pp of allPetPerms) allCandidates.push({ colors: cp, pets: pp });

  const pool: Clue[] = [];
  for (let i = 0; i < 3; i++) {
    pool.push({ text: `${PEOPLE[i]} has the ${colorPerm[i]}.`, test: (c) => c.colors[i] === colorPerm[i], kind: "direct" });
    pool.push({ text: `${PEOPLE[i]} has the ${petPerm[i]}.`, test: (c) => c.pets[i] === petPerm[i], kind: "direct" });
    pool.push({
      text: `The person with the ${colorPerm[i]} has the ${petPerm[i]}.`,
      test: (c) => c.pets[c.colors.indexOf(colorPerm[i])] === petPerm[i],
      kind: "link",
    });
    for (const other of COLORS) {
      if (other !== colorPerm[i]) pool.push({ text: `${PEOPLE[i]} does not have the ${other}.`, test: (c) => c.colors[i] !== other, kind: "negative" });
    }
    for (const other of PETS) {
      if (other !== petPerm[i]) pool.push({ text: `${PEOPLE[i]} does not have the ${other}.`, test: (c) => c.pets[i] !== other, kind: "negative" });
    }
  }

  const tierKinds: Clue["kind"][] = level <= 17 ? ["direct", "link"] : level <= 35 ? ["direct", "link", "negative"] : ["link", "negative"];
  const usable = shuffled(pool.filter((c) => tierKinds.includes(c.kind)));
  const fallback = shuffled(pool); // guarantees we can always reach uniqueness even for the hard tier's smaller pool

  let candidates = allCandidates;
  const usedClues: string[] = [];
  for (const clue of [...usable, ...fallback]) {
    if (candidates.length <= 1) break;
    if (usedClues.includes(clue.text)) continue;
    const filtered = candidates.filter(clue.test);
    if (filtered.length < candidates.length) {
      candidates = filtered;
      usedClues.push(clue.text);
    }
  }

  const targetPerson = Math.floor(Math.random() * 3);
  const askPet = Math.random() < 0.5;
  const answer = askPet ? petPerm[targetPerson] : colorPerm[targetPerson];
  const optionsPool = askPet ? PETS : COLORS;

  return {
    clues: usedClues,
    question: `Which ${askPet ? "pet" : "color"} does ${PEOPLE[targetPerson]} have?`,
    answer,
    options: shuffled(optionsPool),
  };
}

const TIME_LIMIT_BASE = 60;

export default function IQLogicGrid({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);
  const [round, setRound] = useState(() => buildRound(level));
  const timeLimit = Math.max(30, TIME_LIMIT_BASE - level);
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const reportedRef = useRef(false);

  const status: "playing" | "won" | "lost" = outcome ?? (secondsLeft <= 0 ? "lost" : "playing");

  useEffect(() => {
    if (status !== "playing") return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, secondsLeft]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status, status === "won" ? 1 : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function pick(option: string) {
    if (status !== "playing") return;
    setOutcome(option === round.answer ? "won" : "lost");
  }

  function reset() {
    reportedRef.current = false;
    setRound(buildRound(level));
    setSecondsLeft(timeLimit);
    setOutcome(null);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6 text-center">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && `Use the clues to deduce the answer — ${secondsLeft}s left`}
        {status === "won" && "Correct! 🎉"}
        {status === "lost" && `Not quite — the answer was ${round.answer}.`}
      </p>
      <div className="comic-panel-sm max-w-sm space-y-1 p-4 text-left text-sm">
        {round.clues.map((c, i) => (
          <p key={i}>• {c}</p>
        ))}
      </div>
      <p className="font-heading text-lg">{round.question}</p>
      {status === "playing" && (
        <div className="flex flex-wrap justify-center gap-2">
          {round.options.map((o) => (
            <button key={o} onClick={() => pick(o)} className="comic-btn bg-panel px-4 py-2 text-sm">
              {o}
            </button>
          ))}
        </div>
      )}
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
          Try Again
        </button>
      )}
    </div>
  );
}
