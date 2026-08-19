"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

export interface TriviaQuestion {
  q: string;
  options: string[];
  correct: number;
}

// Keyed by game id so the same engine can power themed trivia "packs" — a
// different question bank, not a different game.
export const TRIVIA_PACKS: Record<string, TriviaQuestion[]> = {
  "trivia-blitz": [
    { q: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], correct: 2 },
    { q: "What is the chemical symbol for water?", options: ["H2O", "O2", "CO2", "H2"], correct: 0 },
    { q: "How many days are in a leap year?", options: ["364", "365", "366", "367"], correct: 2 },
    { q: "What is the largest planet in our solar system?", options: ["Earth", "Mars", "Jupiter", "Saturn"], correct: 2 },
    { q: "How many strings does a standard guitar have?", options: ["4", "5", "6", "7"], correct: 2 },
    { q: "What is the freezing point of water in Celsius?", options: ["-10", "0", "10", "32"], correct: 1 },
  ],
  "trivia-science": [
    { q: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Mercury"], correct: 1 },
    {
      q: "What gas do plants absorb from the air for photosynthesis?",
      options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
      correct: 2,
    },
    { q: "What is the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi Body"], correct: 1 },
    { q: "How many bones are in the adult human body?", options: ["186", "206", "226", "246"], correct: 1 },
    { q: "What is the speed of light approximately, in km/s?", options: ["300", "3,000", "30,000", "300,000"], correct: 3 },
    { q: "What force pulls objects toward the Earth?", options: ["Magnetism", "Friction", "Gravity", "Tension"], correct: 2 },
  ],
  "trivia-history": [
    { q: "In what year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2 },
    {
      q: "Who was the first President of the United States?",
      options: ["Thomas Jefferson", "George Washington", "John Adams", "Abraham Lincoln"],
      correct: 1,
    },
    { q: "The Great Wall is located in which country?", options: ["Japan", "India", "China", "Mongolia"], correct: 2 },
    { q: "In what year did the Titanic sink?", options: ["1905", "1912", "1918", "1923"], correct: 1 },
    { q: "Who painted the Mona Lisa?", options: ["Michelangelo", "Da Vinci", "Picasso", "Raphael"], correct: 1 },
    {
      q: "Which ancient civilization built the pyramids of Giza?",
      options: ["Greek", "Roman", "Egyptian", "Mayan"],
      correct: 2,
    },
  ],
  "trivia-geography": [
    { q: "What is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correct: 1 },
    {
      q: "What is the smallest country in the world by area?",
      options: ["Monaco", "San Marino", "Vatican City", "Liechtenstein"],
      correct: 2,
    },
    { q: "Which is the largest hot desert in the world?", options: ["Sahara", "Gobi", "Kalahari", "Arabian"], correct: 0 },
    { q: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2 },
    { q: "Mount Everest is located in which mountain range?", options: ["Andes", "Alps", "Himalayas", "Rockies"], correct: 2 },
    {
      q: "What is the smallest continent by land area?",
      options: ["Europe", "Australia", "Antarctica", "South America"],
      correct: 1,
    },
  ],
  "trivia-movies": [
    {
      q: "Which movie features the quote \"May the Force be with you\"?",
      options: ["Star Trek", "Star Wars", "Guardians of the Galaxy", "Dune"],
      correct: 1,
    },
    { q: "Who directed the movie Jaws?", options: ["George Lucas", "Steven Spielberg", "James Cameron", "Martin Scorsese"], correct: 1 },
    { q: "In The Lion King, what is the name of Simba's father?", options: ["Scar", "Mufasa", "Zazu", "Rafiki"], correct: 1 },
    { q: "What is the name of the ship in the movie Titanic?", options: ["Titanic", "Olympic", "Britannic", "Atlantic"], correct: 0 },
    {
      q: "Who played Iron Man in the Marvel Cinematic Universe?",
      options: ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"],
      correct: 1,
    },
    {
      q: "What is the name of the wizarding school in Harry Potter?",
      options: ["Hogwarts", "Durmstrang", "Beauxbatons", "Ilvermorny"],
      correct: 0,
    },
  ],
  "trivia-sports": [
    { q: "How many players are on a soccer team on the field at once?", options: ["9", "10", "11", "12"], correct: 2 },
    { q: "In tennis, what is a score of zero called?", options: ["Nil", "Love", "Zero", "Duck"], correct: 1 },
    { q: "How often are the Summer Olympics held?", options: ["Every 2 years", "Every 3 years", "Every 4 years", "Every 5 years"], correct: 2 },
    { q: "What sport is played at Wimbledon?", options: ["Golf", "Tennis", "Cricket", "Rugby"], correct: 1 },
    { q: "How many points is a touchdown worth in American football?", options: ["3", "6", "7", "8"], correct: 1 },
    { q: "In basketball, how many players per team are on the court at once?", options: ["4", "5", "6", "7"], correct: 1 },
  ],
  "trivia-animals": [
    { q: "What is the fastest land animal?", options: ["Lion", "Cheetah", "Horse", "Antelope"], correct: 1 },
    { q: "How many legs does a spider have?", options: ["6", "8", "10", "12"], correct: 1 },
    { q: "What is the largest mammal in the world?", options: ["Elephant", "Blue Whale", "Giraffe", "Hippo"], correct: 1 },
    { q: "What do you call a baby kangaroo?", options: ["Cub", "Kit", "Joey", "Pup"], correct: 2 },
    { q: "Which bird is known for its ability to mimic human speech?", options: ["Eagle", "Parrot", "Owl", "Sparrow"], correct: 1 },
    { q: "How many hearts does an octopus have?", options: ["1", "2", "3", "4"], correct: 2 },
  ],
  "trivia-space": [
    { q: "What is the closest planet to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correct: 2 },
    { q: "What galaxy is Earth located in?", options: ["Andromeda", "Milky Way", "Whirlpool", "Triangulum"], correct: 1 },
    { q: "Who was the first person to walk on the Moon?", options: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "John Glenn"], correct: 2 },
    { q: "What do we call a group of stars that forms a pattern?", options: ["Galaxy", "Constellation", "Nebula", "Cluster"], correct: 1 },
    { q: "Which planet has the most moons in our solar system?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], correct: 1 },
    { q: "What is the name of the reusable spacecraft company founded by Elon Musk?", options: ["Blue Origin", "Virgin Galactic", "SpaceX", "NASA"], correct: 2 },
  ],
};

const TIME_LIMIT: Record<Difficulty, number> = { easy: 40, medium: 30, hard: 25 };
const TARGET: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };

function pickQuestion(pool: TriviaQuestion[]): TriviaQuestion {
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function TriviaBlitz({
  gameId,
  difficulty,
  onEnd,
}: {
  gameId: string;
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const pool = TRIVIA_PACKS[gameId] ?? TRIVIA_PACKS["trivia-blitz"];
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);
  const target = TARGET[difficulty];

  const won = phase === "playing" && score >= target;
  const lost = phase === "playing" && !won && secondsLeft <= 0;
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    const tick = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [status, secondsLeft]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status, score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status, score]);

  function start() {
    setScore(0);
    setSecondsLeft(TIME_LIMIT[difficulty]);
    setQuestion(pickQuestion(pool));
    reportedRef.current = false;
    setPhase("playing");
  }

  function answer(i: number) {
    if (status !== "playing" || !question) return;
    if (i === question.correct) setScore((s) => s + 1);
    setQuestion(pickQuestion(pool));
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Answer ${target} correctly before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && question && (
        <>
          <p className="max-w-md text-center text-lg font-bold">{question.q}</p>
          <div className="grid grid-cols-2 gap-2">
            {question.options.map((opt, i) => (
              <button key={i} onClick={() => answer(i)} className="comic-btn bg-panel px-4 py-2 text-sm">
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
