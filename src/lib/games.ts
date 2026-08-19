export type GameKind = "minigame" | "puzzle" | "riddle";
export type Difficulty = "easy" | "medium" | "hard";
export type GameResult = "won" | "lost" | "draw";

// Everything a new piece of content can be gated behind. Omitting `unlock`
// entirely (the original 5 minigames + 12 puzzles/riddles) means always
// available, exactly as today.
export type UnlockCondition =
  | { type: "date"; after: string; label: string } // ISO "YYYY-MM-DD"; label is the human release-wave name ("next week" etc.)
  | { type: "trophies"; tier: "bronze" | "silver" | "gold" | "any"; count: number }
  | { type: "achievement"; id: string } // a specific achievement id from src/lib/achievements.ts
  | { type: "habitCheckIns"; count: number }
  | { type: "goalsCompleted"; count: number }
  | { type: "tasksCompleted"; count: number }
  | { type: "focusHours"; count: number }
  | { type: "gamesCompleted"; ids: string[] }; // must have beaten/solved every id listed

export interface GameDef {
  id: string;
  kind: GameKind;
  title: string;
  emoji: string;
  difficulty: Difficulty;
  rewardMinutes: number;
  description: string;
  unlock?: UnlockCondition;
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
  {
    id: "rps",
    kind: "minigame",
    title: "Rock-Paper-Scissors Blitz",
    emoji: "✊",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Best of 5 against the CPU.",
    unlock: { type: "date", after: "2026-08-26", label: "Next week" },
  },
  {
    id: "simon-says",
    kind: "minigame",
    title: "Simon Says",
    emoji: "🎵",
    difficulty: "medium",
    rewardMinutes: 9,
    description: "Repeat the growing color sequence.",
    unlock: { type: "tasksCompleted", count: 10 },
  },
  {
    id: "whack-a-mole",
    kind: "minigame",
    title: "Whack-a-Mole",
    emoji: "🔨",
    difficulty: "medium",
    rewardMinutes: 9,
    description: "Tap moles before they duck back down.",
    unlock: { type: "focusHours", count: 10 },
  },
  {
    id: "word-scramble",
    kind: "minigame",
    title: "Word Scramble",
    emoji: "🔤",
    difficulty: "medium",
    rewardMinutes: 9,
    description: "Unscramble the word before time runs out.",
    unlock: { type: "habitCheckIns", count: 20 },
  },
  {
    id: "connect-four",
    kind: "minigame",
    title: "Connect Four",
    emoji: "🔴",
    difficulty: "hard",
    rewardMinutes: 16,
    description: "Get four in a row against the CPU.",
    unlock: { type: "gamesCompleted", ids: ["chess", "2048"] },
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
  {
    id: "puzzle-bridge",
    kind: "puzzle",
    title: "The Bridge Crossing",
    emoji: "🌉",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "A classic timing/logistics puzzle.",
    question:
      "Four people must cross a rickety bridge at night with one flashlight. At most 2 can cross at once, and every crossing needs the flashlight (someone must carry it back). Their solo crossing times are 1, 2, 5, and 10 minutes; a pair moves at the slower person's pace. What's the fastest total time (in minutes) to get everyone across?",
    answers: ["17"],
    unlock: { type: "date", after: "2026-09-19", label: "Next month" },
  },
  {
    id: "puzzle-wolf-goat-cabbage",
    kind: "puzzle",
    title: "Wolf, Goat, and Cabbage",
    emoji: "🐐",
    difficulty: "medium",
    rewardMinutes: 11,
    description: "A classic river-crossing puzzle.",
    question:
      "A farmer must ferry a wolf, a goat, and a cabbage across a river one at a time, but can never leave the wolf alone with the goat, or the goat alone with the cabbage. What's the minimum number of river crossings (trips across, either direction) needed?",
    answers: ["7"],
    unlock: { type: "trophies", tier: "any", count: 5 },
  },
  {
    id: "puzzle-twelve-balls",
    kind: "puzzle",
    title: "The Twelve Balls",
    emoji: "⚖️",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "A classic balance-scale puzzle.",
    question:
      "You have 12 balls, identical except one is either heavier or lighter than the rest. Using only a balance scale, what's the minimum number of weighings needed to always find the odd ball out?",
    answers: ["3"],
    unlock: { type: "date", after: "2027-08-19", label: "Next year" },
  },
  {
    id: "puzzle-camel-bananas",
    kind: "puzzle",
    title: "The Camel and Bananas",
    emoji: "🐪",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "A classic optimization puzzle.",
    question:
      "A camel must carry 3000 bananas 1000 miles to market. It can carry at most 1000 bananas at once, and eats 1 banana per mile walked (in either direction). What's the maximum number of bananas that can reach the market?",
    answers: ["533"],
    unlock: { type: "gamesCompleted", ids: ["2048"] },
  },
  {
    id: "puzzle-josephus",
    kind: "puzzle",
    title: "The Josephus Circle",
    emoji: "🔄",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "A classic elimination puzzle.",
    question:
      "10 people stand in a circle, numbered 1 to 10. Starting at person 1, you skip one person and eliminate the next, continuing around and around until only one remains. What number is the survivor?",
    answers: ["5"],
    unlock: { type: "focusHours", count: 50 },
  },
  {
    id: "puzzle-monty-hall",
    kind: "puzzle",
    title: "The Monty Hall Problem",
    emoji: "🚪",
    difficulty: "medium",
    rewardMinutes: 11,
    description: "A classic probability puzzle.",
    question:
      "3 doors: a car behind one, goats behind the other two. You pick a door, the host (who knows what's behind each) opens a different door revealing a goat, then offers you the chance to switch. As a simplified fraction, what's your win probability if you always switch?",
    answers: ["2/3", "two thirds"],
    unlock: { type: "tasksCompleted", count: 20 },
  },
  {
    id: "puzzle-counterfeit-coin",
    kind: "puzzle",
    title: "The Counterfeit Coin",
    emoji: "🪙",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A classic balance-scale puzzle.",
    question:
      "You have 9 coins, identical except one is fake and heavier. Using a balance scale, what's the minimum number of weighings needed to always find the fake?",
    answers: ["2"],
    unlock: { type: "habitCheckIns", count: 40 },
  },
  {
    id: "puzzle-rope-earth",
    kind: "puzzle",
    title: "The Rope Around the Earth",
    emoji: "🌍",
    difficulty: "medium",
    rewardMinutes: 12,
    description: "A classic geometry puzzle.",
    question:
      "A rope is wrapped snugly around the Earth's equator. You add exactly 1 extra meter of rope and lift it evenly all the way around so the gap above the ground is the same everywhere. Rounded to the nearest whole centimeter, how big is the gap?",
    answers: ["16", "16cm", "16 cm"],
    unlock: { type: "date", after: "2026-08-26", label: "Next week" },
  },
  {
    id: "puzzle-handshakes",
    kind: "puzzle",
    title: "The Handshake Problem",
    emoji: "🤝",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A classic combinatorics puzzle.",
    question: "At a party of 10 people, everyone shakes hands with everyone else exactly once. How many handshakes happen in total?",
    answers: ["45"],
    unlock: { type: "trophies", tier: "gold", count: 1 },
  },
  {
    id: "puzzle-lockers",
    kind: "puzzle",
    title: "The Locker Problem",
    emoji: "🔐",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "A classic number-theory puzzle.",
    question:
      "100 lockers stand closed in a row, numbered 1 to 100. 100 students walk past in turn: student i toggles (opens if closed, closes if open) every i-th locker. After all 100 students pass, how many lockers are open?",
    answers: ["10"],
    unlock: { type: "achievement", id: "tasks-25" },
  },
  {
    id: "puzzle-four-color-map",
    kind: "puzzle",
    title: "The Four-Color Map",
    emoji: "🗺️",
    difficulty: "easy",
    rewardMinutes: 5,
    description: "A famous theorem, turned into a question.",
    question:
      "What is the minimum number of colors needed to color any map so that no two regions sharing a border have the same color (the Four Color Theorem)?",
    answers: ["4", "four"],
    unlock: { type: "goalsCompleted", count: 2 },
  },
  {
    id: "puzzle-trains-bird",
    kind: "puzzle",
    title: "The Two Trains and a Bird",
    emoji: "🚂",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A classic instant-answer puzzle.",
    question:
      "Two trains 60 miles apart race toward each other, one at 20 mph, the other at 40 mph. A bird starts at one train and flies back and forth between them at 60 mph until they collide. How many total miles does the bird fly?",
    answers: ["60"],
    unlock: { type: "goalsCompleted", count: 1 },
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
  {
    id: "riddle-map",
    kind: "riddle",
    title: "Cities, No Houses",
    emoji: "🗺️",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A classic riddle.",
    question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
    answers: ["map", "a map"],
    unlock: { type: "date", after: "2026-08-26", label: "Next week" },
  },
  {
    id: "riddle-hole",
    kind: "riddle",
    title: "The Bigger I Get",
    emoji: "🕳️",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A classic riddle.",
    question: "The more you take away from me, the bigger I become. What am I?",
    answers: ["hole", "a hole"],
    unlock: { type: "tasksCompleted", count: 5 },
  },
  {
    id: "riddle-bank",
    kind: "riddle",
    title: "Branches, No Leaves",
    emoji: "🏦",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A classic riddle.",
    question: "I have branches, but no fruit, trunk, or leaves. What am I?",
    answers: ["bank", "a bank"],
    unlock: { type: "gamesCompleted", ids: ["chess"] },
  },
  {
    id: "riddle-stamp",
    kind: "riddle",
    title: "Traveling in a Corner",
    emoji: "📮",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A classic riddle.",
    question: "What can travel all around the world while staying stuck in a corner?",
    answers: ["stamp", "a stamp", "postage stamp"],
    unlock: { type: "focusHours", count: 20 },
  },
  {
    id: "riddle-future",
    kind: "riddle",
    title: "Always Ahead",
    emoji: "⏳",
    difficulty: "medium",
    rewardMinutes: 11,
    description: "A classic riddle.",
    question: "I am always in front of you, yet I can never be seen. What am I?",
    answers: ["future", "the future"],
    unlock: { type: "habitCheckIns", count: 10 },
  },
  {
    id: "riddle-bottle",
    kind: "riddle",
    title: "Neck, No Head",
    emoji: "🍾",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A classic riddle.",
    question: "What has a neck but no head?",
    answers: ["bottle", "a bottle"],
    unlock: { type: "date", after: "2026-09-19", label: "Next month" },
  },
  {
    id: "riddle-age",
    kind: "riddle",
    title: "Never Comes Down",
    emoji: "🎂",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A classic riddle.",
    question: "What goes up but never comes down?",
    answers: ["age", "your age"],
    unlock: { type: "trophies", tier: "silver", count: 2 },
  },
  {
    id: "riddle-needle",
    kind: "riddle",
    title: "One Eye, No Sight",
    emoji: "🪡",
    difficulty: "medium",
    rewardMinutes: 11,
    description: "A classic riddle.",
    question: "What has one eye but cannot see?",
    answers: ["needle", "a needle"],
    unlock: { type: "goalsCompleted", count: 5 },
  },
  {
    id: "riddle-cold",
    kind: "riddle",
    title: "Catch, Don't Throw",
    emoji: "🤧",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A classic riddle.",
    question: "What can you catch but not throw?",
    answers: ["cold", "a cold"],
    unlock: { type: "date", after: "2027-08-19", label: "Next year" },
  },
  {
    id: "riddle-piano",
    kind: "riddle",
    title: "Many Keys, No Locks",
    emoji: "🎹",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "A classic riddle.",
    question: "What has many keys but can't open a single lock?",
    answers: ["piano", "a piano"],
    unlock: { type: "gamesCompleted", ids: ["tic-tac-toe", "chess"] },
  },
  {
    id: "riddle-river",
    kind: "riddle",
    title: "Runs, Never Walks",
    emoji: "🏞️",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "A classic riddle.",
    question: "What runs but never walks, has a mouth but never talks, has a bed but never sleeps?",
    answers: ["river", "a river"],
    unlock: { type: "achievement", id: "study-streak-7" },
  },
  {
    id: "riddle-glove",
    kind: "riddle",
    title: "Thumb and Four Fingers",
    emoji: "🧤",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "A classic riddle.",
    question: "I have a thumb and four fingers, but I am not alive. What am I?",
    answers: ["glove", "a glove"],
    unlock: { type: "trophies", tier: "any", count: 10 },
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
