export type GameKind = "minigame" | "puzzle" | "riddle";
export type Difficulty = "easy" | "medium" | "hard";
export type GameResult = "won" | "lost" | "draw";

export interface GameDef {
  id: string;
  kind: GameKind;
  title: string;
  emoji: string;
  difficulty: Difficulty;
  rewardMinutes: number;
  description: string;
}

export interface AnswerDef extends GameDef {
  question: string;
  answers: string[]; // accepted answers, matched case/whitespace/punctuation-insensitive
}

// Most recent Monday 00:00 (server-local) — the boundary the weekly minigame
// cap resets on.
export function startOfWeek(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

export function difficultyBonus(baseMinutes: number, difficulty: Difficulty): number {
  return Math.round(baseMinutes * DIFFICULTY_BONUS_PCT[difficulty]);
}

export const MINIGAMES: GameDef[] = [
  {
    id: "tic-tac-toe",
    kind: "minigame",
    title: "Tic-Tac-Toe",
    emoji: "⭕",
    difficulty: "easy",
    rewardMinutes: 5,
    description: "Beat the CPU at X's and O's.",
  },
  {
    id: "snake",
    kind: "minigame",
    title: "Snake",
    emoji: "🐍",
    difficulty: "medium",
    rewardMinutes: 8,
    description: "Eat, grow, don't hit yourself.",
  },
  {
    id: "memory",
    kind: "minigame",
    title: "Memory Match",
    emoji: "🧠",
    difficulty: "medium",
    rewardMinutes: 8,
    description: "Flip cards, find every pair.",
  },
  {
    id: "2048",
    kind: "minigame",
    title: "2048",
    emoji: "🔢",
    difficulty: "hard",
    rewardMinutes: 12,
    description: "Merge tiles to reach 2048.",
  },
  {
    id: "chess",
    kind: "minigame",
    title: "Chess",
    emoji: "♟️",
    difficulty: "hard",
    rewardMinutes: 15,
    description: "Capture the CPU's king.",
  },
];

// Minigames now use a player-chosen per-play difficulty (see GameDetailPage)
// instead of a flat daily cap. Replay for fun as much as you want — these
// caps only gate how many of those plays actually earn a reward.
//
// Daily: how many *rewarded* plays a single game allows per difficulty tier
// per day. Harder tiers are scarcer since they're worth more.
export const MINIGAME_DAILY_LIMIT_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 2,
  medium: 1,
  hard: 1,
};

// Weekly: total rewarded minigame plays allowed across ALL minigames
// combined, reset every Monday. Once used up, every minigame is locked for
// rewards until next week (you can still play, just for fun).
export const MINIGAME_WEEKLY_CAP = 15;

// Bonus added on top of a minigame's base rewardMinutes, based on the
// difficulty tier the play was completed at. Applied once per play — never
// stacked or doubled.
export const DIFFICULTY_BONUS_PCT: Record<Difficulty, number> = {
  easy: 0,
  medium: 0.1,
  hard: 0.3,
};

export const PUZZLES: AnswerDef[] = [
  {
    id: "puzzle-double-halve",
    kind: "puzzle",
    title: "The Missing Number",
    emoji: "🧮",
    difficulty: "easy",
    rewardMinutes: 5,
    description: "A number riddle.",
    question: "Think of a number. Double it, add 6, then halve it. You get 11. What was the original number?",
    answers: ["8"],
  },
  {
    id: "puzzle-fibonacci",
    kind: "puzzle",
    title: "What Comes Next",
    emoji: "🔁",
    difficulty: "easy",
    rewardMinutes: 5,
    description: "A sequence puzzle.",
    question: "What comes next in the sequence: 1, 1, 2, 3, 5, 8, 13, ?",
    answers: ["21"],
  },
  {
    id: "puzzle-sheep",
    kind: "puzzle",
    title: "The Farmer's Sheep",
    emoji: "🐑",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A classic trick question.",
    question: "A farmer has 17 sheep. All but 9 die. How many sheep are left?",
    answers: ["9"],
  },
  {
    id: "puzzle-machines",
    kind: "puzzle",
    title: "The Widget Machines",
    emoji: "⚙️",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A rate/logic puzzle.",
    question: "If 5 machines take 5 minutes to make 5 widgets, how many minutes would 100 machines take to make 100 widgets?",
    answers: ["5"],
  },
  {
    id: "puzzle-ropes",
    kind: "puzzle",
    title: "The Burning Ropes",
    emoji: "🔥",
    difficulty: "hard",
    rewardMinutes: 15,
    description: "A classic timing puzzle.",
    question:
      "You have two ropes. Each takes exactly 60 minutes to burn, but burns unevenly along its length. Using fire and both ropes cleverly, what's the longest single duration (in minutes) you can measure exactly?",
    answers: ["45"],
  },
  {
    id: "puzzle-photo",
    kind: "puzzle",
    title: "The Photograph",
    emoji: "🖼️",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "A classic lateral-thinking puzzle.",
    question:
      "A man looks at a photo and says: \"Brothers and sisters, I have none. But that man's father is my father's son.\" Who is in the photo? (one word)",
    answers: ["son", "his son"],
  },
];

export const RIDDLES: AnswerDef[] = [
  {
    id: "riddle-keyboard",
    kind: "riddle",
    title: "No Locks, No Room",
    emoji: "🕵️",
    difficulty: "easy",
    rewardMinutes: 5,
    description: "A classic riddle.",
    question: "What has keys but no locks, space but no room, and you can enter but not go inside?",
    answers: ["keyboard", "a keyboard"],
  },
  {
    id: "riddle-footsteps",
    kind: "riddle",
    title: "Left Behind",
    emoji: "👣",
    difficulty: "easy",
    rewardMinutes: 5,
    description: "A classic riddle.",
    question: "The more you take, the more you leave behind. What am I?",
    answers: ["footsteps", "footprints"],
  },
  {
    id: "riddle-echo",
    kind: "riddle",
    title: "The Voice With No Body",
    emoji: "📢",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A classic riddle.",
    question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
    answers: ["echo", "an echo"],
  },
  {
    id: "riddle-artichoke",
    kind: "riddle",
    title: "The Heart That Doesn't Beat",
    emoji: "💚",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A tricky one.",
    question: "What has a heart that doesn't beat?",
    answers: ["artichoke", "an artichoke"],
  },
  {
    id: "riddle-locked-room",
    kind: "riddle",
    title: "The Locked Room Mystery",
    emoji: "🔍",
    difficulty: "hard",
    rewardMinutes: 15,
    description: "A detective mystery.",
    question:
      "A detective finds a man dead in a locked room, with only a puddle of water and some broken glass on the floor. There's no other clue. What was the murder weapon — now melted away?",
    answers: ["ice", "icicle", "an icicle"],
  },
  {
    id: "riddle-fire",
    kind: "riddle",
    title: "Alive Without Breathing",
    emoji: "🔥",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "A classic riddle.",
    question:
      "I am not alive, but I grow. I don't have lungs, but I need air. I don't have a mouth, and water kills me. What am I?",
    answers: ["fire", "a flame", "flame"],
  },
];

export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[.,!?'"]/g, "")
    .replace(/\s+/g, " ");
}

export function isCorrectAnswer(def: AnswerDef, raw: string): boolean {
  const normalized = normalizeAnswer(raw);
  return def.answers.some((a) => normalizeAnswer(a) === normalized);
}

export function findGameDef(id: string): GameDef | AnswerDef | undefined {
  return (
    MINIGAMES.find((g) => g.id === id) ||
    PUZZLES.find((g) => g.id === id) ||
    RIDDLES.find((g) => g.id === id)
  );
}

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: "var(--comic-green)",
  medium: "var(--comic-orange)",
  hard: "var(--comic-red)",
};
