"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

// Keyed by game id so the same engine can power themed "packs" that unlock
// on their own weekly schedule — a different word list, not a different game.
export const WORD_SCRAMBLE_PACKS: Record<string, Record<Difficulty, string[]>> = {
  "word-scramble": {
    easy: ["CAT", "DOG", "SUN", "BOOK", "TREE", "FISH"],
    medium: ["PLANET", "GUITAR", "PUZZLE", "GARDEN", "PENCIL", "WINDOW"],
    hard: ["ELEPHANT", "COMPUTER", "MOUNTAIN", "CHOCOLATE", "ADVENTURE", "TELESCOPE"],
  },
  "word-scramble-animals": {
    easy: ["CAT", "DOG", "PIG", "OWL", "BEAR", "LION"],
    medium: ["RABBIT", "MONKEY", "DONKEY", "PANTHER", "DOLPHIN", "GIRAFFE"],
    hard: ["ELEPHANT", "CROCODILE", "KANGAROO", "CHIMPANZEE", "RHINOCEROS", "HIPPOPOTAMUS"],
  },
  "word-scramble-countries": {
    easy: ["CHAD", "CUBA", "PERU", "CHINA", "INDIA", "SPAIN"],
    medium: ["FRANCE", "MEXICO", "CANADA", "NORWAY", "IRELAND", "GERMANY"],
    hard: ["AUSTRALIA", "ARGENTINA", "SWITZERLAND", "PHILIPPINES", "INDONESIA", "KAZAKHSTAN"],
  },
  "word-scramble-sports": {
    easy: ["GOLF", "SWIM", "RUN", "SKI", "BOX", "DIVE"],
    medium: ["TENNIS", "HOCKEY", "SOCCER", "RUGBY", "CYCLING", "ROWING"],
    hard: ["BASKETBALL", "BADMINTON", "GYMNASTICS", "VOLLEYBALL", "WRESTLING", "SKATEBOARD"],
  },
  "word-scramble-fruits": {
    easy: ["FIG", "PEAR", "PLUM", "LIME", "KIWI", "APPLE"],
    medium: ["MANGO", "GRAPE", "LEMON", "CHERRY", "PAPAYA", "APRICOT"],
    hard: ["PINEAPPLE", "WATERMELON", "STRAWBERRY", "POMEGRANATE", "GRAPEFRUIT", "PASSIONFRUIT"],
  },
  "word-scramble-movies": {
    easy: ["JAWS", "SAW", "UP", "CARS", "ELF", "RIO"],
    medium: ["FROZEN", "AVATAR", "MATRIX", "ROCKY", "GREASE", "MOANA"],
    hard: ["INCEPTION", "GLADIATOR", "TITANIC", "INTERSTELLAR", "CASABLANCA", "GOODFELLAS"],
  },
  "word-scramble-colors": {
    easy: ["RED", "PINK", "TEAL", "GOLD", "GRAY", "NAVY"],
    medium: ["PURPLE", "ORANGE", "YELLOW", "MAROON", "SILVER", "VIOLET"],
    hard: ["TURQUOISE", "MAGENTA", "LAVENDER", "CHARCOAL", "CRIMSON", "PERIWINKLE"],
  },
  "word-scramble-space": {
    easy: ["SUN", "MOON", "STAR", "MARS", "ORBIT", "COMET"],
    medium: ["PLANET", "GALAXY", "METEOR", "ROCKET", "NEBULA", "SATURN"],
    hard: ["ASTEROID", "TELESCOPE", "ATMOSPHERE", "CONSTELLATION", "ASTRONAUT", "GRAVITY"],
  },
  "word-scramble-food": {
    easy: ["SOUP", "RICE", "CAKE", "TACO", "BREAD", "PASTA"],
    medium: ["BURGER", "NOODLE", "PANCAKE", "SANDWICH", "OMELETTE", "BURRITO"],
    hard: ["SPAGHETTI", "CASSEROLE", "QUESADILLA", "CHEESECAKE", "BRUSCHETTA", "GUACAMOLE"],
  },
  "word-scramble-jobs": {
    easy: ["COOK", "NURSE", "PILOT", "ACTOR", "JUDGE", "MAYOR"],
    medium: ["DOCTOR", "DENTIST", "PLUMBER", "TEACHER", "FARMER", "LAWYER"],
    hard: ["ENGINEER", "ARCHITECT", "ELECTRICIAN", "ACCOUNTANT", "VETERINARIAN", "PHOTOGRAPHER"],
  },
  "word-scramble-music": {
    easy: ["POP", "JAZZ", "SONG", "BEAT", "DRUM", "TUNE"],
    medium: ["GUITAR", "PIANO", "VIOLIN", "RHYTHM", "MELODY", "SINGER"],
    hard: ["ORCHESTRA", "SYMPHONY", "HARMONICA", "SAXOPHONE", "ACCORDION", "PERCUSSION"],
  },
  "word-scramble-weather": {
    easy: ["RAIN", "SNOW", "WIND", "FOG", "HAIL", "SUN"],
    medium: ["STORM", "CLOUDY", "DROUGHT", "THUNDER", "BREEZE", "HUMID"],
    hard: ["HURRICANE", "BLIZZARD", "TORNADO", "MONSOON", "AVALANCHE", "TEMPERATURE"],
  },
  "word-scramble-emotions": {
    easy: ["JOY", "SAD", "FEAR", "CALM", "MAD", "SHY"],
    medium: ["HAPPY", "ANGRY", "PROUD", "EXCITED", "NERVOUS", "JEALOUS"],
    hard: ["ANXIOUS", "GRATEFUL", "CONFUSED", "OPTIMISTIC", "FRUSTRATED", "OVERWHELMED"],
  },
  "word-scramble-gadgets": {
    easy: ["FAN", "LAMP", "CLOCK", "RADIO", "PHONE", "TV"],
    medium: ["CAMERA", "LAPTOP", "TABLET", "SPEAKER", "PRINTER", "MONITOR"],
    hard: ["HEADPHONES", "MICROWAVE", "PROJECTOR", "SMARTWATCH", "REFRIGERATOR", "DISHWASHER"],
  },
};

const TIME_LIMIT: Record<Difficulty, number> = { easy: 30, medium: 25, hard: 20 };

function scramble(word: string): string {
  const letters = word.split("");
  let attempt = letters;
  do {
    attempt = [...letters];
    for (let i = attempt.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [attempt[i], attempt[j]] = [attempt[j], attempt[i]];
    }
  } while (attempt.join("") === word && word.length > 1);
  return attempt.join("");
}

export default function WordScramble({
  gameId,
  difficulty,
  onEnd,
}: {
  gameId: string;
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const wordPack = WORD_SCRAMBLE_PACKS[gameId] ?? WORD_SCRAMBLE_PACKS["word-scramble"];
  const [word, setWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [guess, setGuess] = useState("");
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
    const pool = wordPack[difficulty];
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setWord(chosen);
    setScrambled(scramble(chosen));
    setGuess("");
    setSecondsLeft(TIME_LIMIT[difficulty]);
    reportedRef.current = false;
    setStatus("playing");
  }

  function submit() {
    if (status !== "playing") return;
    if (guess.trim().toUpperCase() === word) {
      setStatus("won");
      if (!reportedRef.current) {
        reportedRef.current = true;
        onEnd("won");
      }
    } else {
      setStatus("lost");
      if (!reportedRef.current) {
        reportedRef.current = true;
        onEnd("lost");
      }
    }
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Unscramble the word — ${TIME_LIMIT[difficulty]}s to answer`}
        {status === "playing" && `Time left: ${secondsLeft}s`}
        {status === "won" && `Correct! The word was ${word} 🎉`}
        {status === "lost" && `Not quite — the word was ${word}`}
      </p>
      {status === "playing" && (
        <>
          <p className="font-heading text-3xl tracking-[0.3em]">{scrambled}</p>
          <input
            autoFocus
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="comic-input px-3 py-2 text-center text-lg uppercase"
            placeholder="Your guess"
          />
          <button onClick={submit} className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink">
            Submit
          </button>
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
