export type GameKind = "minigame" | "puzzle" | "riddle" | "iq" | "qmaster";
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

// Anchor for the weekly content-drip schedule: a new puzzle, riddle, AND
// minigame all unlock every Monday for a full year. This anchor is itself a
// Monday (2026-08-17) so weekUnlockDate(n) = anchor + n*7 days always lands
// on a Monday. Computing dates from this anchor (instead of hand-writing 52
// date strings) keeps the schedule correct and easy to extend.
const CONTENT_LAUNCH_DATE = new Date("2026-08-17T00:00:00Z");

export function weekUnlockDate(weekNumber: number): string {
  const d = new Date(CONTENT_LAUNCH_DATE);
  d.setUTCDate(d.getUTCDate() + weekNumber * 7);
  return d.toISOString().slice(0, 10);
}

function weeklyUnlock(weekNumber: number): UnlockCondition {
  return { type: "date", after: weekUnlockDate(weekNumber), label: `Week ${weekNumber}` };
}

// Which weekly-drop week we're currently in (0 = launch week, before
// anything has dropped; 1-52 = that week's puzzle + riddle are live).
export function currentContentWeek(now: Date = new Date()): number {
  const diffDays = Math.floor((now.getTime() - CONTENT_LAUNCH_DATE.getTime()) / 86_400_000);
  return Math.max(0, Math.min(52, Math.floor(diffDays / 7)));
}

// One brand-new minigame unlocks every Monday for a full year. At most 10 of
// these 51 weeks reuse an existing engine (Word Scramble, Memory, Speed
// Math) with fresh content — a themed "pack," not a different game, same
// pattern as the puzzle/riddle content packs. Every other week — at least
// 42 of the 52 total, counting Rock-Paper-Scissors above — has its own
// standalone mechanic that appears nowhere else in the schedule.
interface WeeklyMinigameSpec {
  week: number;
  id: string;
  title: string;
  emoji: string;
  difficulty: Difficulty;
  rewardMinutes: number;
  description: string;
}

const WEEKLY_MINIGAME_SPECS: WeeklyMinigameSpec[] = [
  // --- Themed reuses (10 total): Word Scramble x4, Memory x4, Speed Math x2 ---
  { week: 5, id: "word-scramble-animals", title: "Word Scramble: Animals", emoji: "🐾", difficulty: "medium", rewardMinutes: 9, description: "Unscramble animal names." },
  { week: 11, id: "memory-animals", title: "Memory: Animals", emoji: "🐾", difficulty: "medium", rewardMinutes: 9, description: "Flip cards, find every animal pair." },
  { week: 17, id: "speed-math-addition", title: "Speed Math: Addition & Subtraction", emoji: "➕", difficulty: "medium", rewardMinutes: 9, description: "Solve add/subtract problems fast." },
  { week: 23, id: "word-scramble-countries", title: "Word Scramble: Countries", emoji: "🌎", difficulty: "medium", rewardMinutes: 9, description: "Unscramble country names." },
  { week: 29, id: "memory-food", title: "Memory: Food", emoji: "🍔", difficulty: "medium", rewardMinutes: 9, description: "Flip cards, find every food pair." },
  { week: 35, id: "speed-math-multiplication", title: "Speed Math: Multiplication", emoji: "✖️", difficulty: "medium", rewardMinutes: 9, description: "Solve multiplication problems fast." },
  { week: 38, id: "word-scramble-space", title: "Word Scramble: Space", emoji: "🌌", difficulty: "medium", rewardMinutes: 9, description: "Unscramble space words." },
  { week: 41, id: "memory-ocean", title: "Memory: Ocean", emoji: "🌊", difficulty: "medium", rewardMinutes: 9, description: "Flip cards, find every ocean pair." },
  { week: 44, id: "word-scramble-food", title: "Word Scramble: Food", emoji: "🍽️", difficulty: "medium", rewardMinutes: 9, description: "Unscramble food names." },
  { week: 47, id: "memory-fantasy", title: "Memory: Fantasy", emoji: "🐉", difficulty: "medium", rewardMinutes: 9, description: "Flip cards, find every fantasy pair." },

  // --- Standalone mechanics already built as always-available minigames,
  //     given their own weekly slot here (6) ---
  { week: 2, id: "twenty-four-game", title: "24 Game", emoji: "🔢", difficulty: "hard", rewardMinutes: 13, description: "Combine 4 numbers with +−×÷ to hit the target." },
  { week: 8, id: "reaction-test", title: "Reaction Test", emoji: "⚡", difficulty: "medium", rewardMinutes: 9, description: "Click the instant it turns green." },
  { week: 14, id: "pattern-memory", title: "Pattern Memory", emoji: "🧩", difficulty: "medium", rewardMinutes: 9, description: "Memorize the lit cells, then click them from memory." },
  { week: 20, id: "mini-sudoku", title: "Mini Sudoku", emoji: "🟦", difficulty: "hard", rewardMinutes: 13, description: "Fill the 4x4 grid — every row, column, and box gets 1-4." },
  { week: 26, id: "trivia-blitz", title: "Trivia Blitz", emoji: "🧠", difficulty: "medium", rewardMinutes: 9, description: "Answer general knowledge questions fast." },
  { week: 32, id: "odd-one-out", title: "Odd One Out", emoji: "🔍", difficulty: "medium", rewardMinutes: 9, description: "Spot the mismatched tile before time runs out." },

  // --- 35 brand-new, one-of-a-kind mechanics ---
  { week: 3, id: "maze-runner", title: "Maze Runner", emoji: "🧭", difficulty: "medium", rewardMinutes: 10, description: "Navigate a maze to the exit before time runs out." },
  { week: 4, id: "balance-game", title: "Balance Game", emoji: "🎚️", difficulty: "medium", rewardMinutes: 9, description: "Keep a drifting marker centered on the bar." },
  { week: 6, id: "number-chain", title: "Number Chain", emoji: "🔗", difficulty: "easy", rewardMinutes: 8, description: "Click scattered numbers in ascending order, fast." },
  { week: 7, id: "bubble-pop", title: "Bubble Pop", emoji: "🫧", difficulty: "medium", rewardMinutes: 9, description: "Pop bubbles before too many escape." },
  { week: 9, id: "slider-stop", title: "Slider Stop", emoji: "🎯", difficulty: "medium", rewardMinutes: 9, description: "Stop a moving marker inside the target zone." },
  { week: 10, id: "simon-reverse", title: "Simon Reverse", emoji: "🔄", difficulty: "hard", rewardMinutes: 13, description: "Repeat the flashed color sequence backwards." },
  { week: 12, id: "digit-span-memory", title: "Digit Span Memory", emoji: "🔢", difficulty: "hard", rewardMinutes: 13, description: "Memorize a number, then type it back." },
  { week: 13, id: "anagram-builder", title: "Anagram Builder", emoji: "🔡", difficulty: "hard", rewardMinutes: 14, description: "Build as many words as you can from the letters." },
  { week: 15, id: "guess-the-pattern", title: "Guess the Pattern", emoji: "📈", difficulty: "medium", rewardMinutes: 10, description: "Figure out the next number in the sequence." },
  { week: 16, id: "true-false-blitz", title: "True or False Blitz", emoji: "✅", difficulty: "easy", rewardMinutes: 8, description: "Rapid-fire true/false general knowledge." },
  { week: 18, id: "number-line-jump", title: "Number Line Jump", emoji: "📏", difficulty: "medium", rewardMinutes: 9, description: "Click where each number belongs on a 0-100 line." },
  { week: 19, id: "sequence-sum", title: "Sequence Sum", emoji: "➕", difficulty: "medium", rewardMinutes: 10, description: "Click numbers that add up to the target." },
  { week: 21, id: "grid-painter", title: "Grid Painter", emoji: "🖌️", difficulty: "easy", rewardMinutes: 8, description: "Copy a visible pattern onto your own grid, fast." },
  { week: 22, id: "balance-scale-logic", title: "Balance Scale Logic", emoji: "⚖️", difficulty: "easy", rewardMinutes: 7, description: "Click the heavier side of the scale." },
  { week: 24, id: "word-ladder", title: "Word Ladder", emoji: "🪜", difficulty: "hard", rewardMinutes: 14, description: "Change one letter at a time to reach the target word." },
  { week: 25, id: "rhyme-time", title: "Rhyme Time", emoji: "🎤", difficulty: "easy", rewardMinutes: 8, description: "Pick the word that rhymes." },
  { week: 27, id: "math-chain", title: "Math Chain", emoji: "⛓️", difficulty: "medium", rewardMinutes: 10, description: "Follow a chain of operations to the final result." },
  { week: 28, id: "category-sort", title: "Category Sort", emoji: "🗂️", difficulty: "easy", rewardMinutes: 8, description: "Sort each item into its correct category, fast." },
  { week: 30, id: "balloon-pop-timing", title: "Balloon Pop Timing", emoji: "🎈", difficulty: "medium", rewardMinutes: 9, description: "Pop the balloon right before it pops on its own." },
  { week: 31, id: "secret-code", title: "Secret Code", emoji: "🔐", difficulty: "hard", rewardMinutes: 13, description: "Decode shift-cipher words against the clock." },
  { week: 33, id: "coin-flip-streak", title: "Coin Flip Streak", emoji: "🪙", difficulty: "easy", rewardMinutes: 7, description: "Predict flips to build a winning streak." },
  { week: 34, id: "estimate-the-time", title: "Estimate the Time", emoji: "⏱️", difficulty: "medium", rewardMinutes: 9, description: "Stop the hidden timer as close to the target as you can." },
  { week: 36, id: "speed-sort", title: "Speed Sort", emoji: "🔤", difficulty: "medium", rewardMinutes: 9, description: "Click words in alphabetical order, fast." },
  { week: 37, id: "emoji-story", title: "Emoji Story", emoji: "🎭", difficulty: "medium", rewardMinutes: 10, description: "Guess the movie from the emoji." },
  { week: 39, id: "missing-letter", title: "Missing Letter", emoji: "✏️", difficulty: "easy", rewardMinutes: 8, description: "Fill in the one missing letter of the word." },
  { week: 40, id: "count-the-shapes", title: "Count the Shapes", emoji: "🔷", difficulty: "easy", rewardMinutes: 8, description: "Count how many of the target shape appear." },
  { week: 42, id: "quick-sum", title: "Quick Sum", emoji: "👀", difficulty: "medium", rewardMinutes: 9, description: "Glance at the numbers, then pick their sum." },
  { week: 43, id: "memory-grid-numbers", title: "Memory Grid Numbers", emoji: "🧠", difficulty: "medium", rewardMinutes: 10, description: "Memorize where each number is, then find one." },
  { week: 45, id: "directions-recall", title: "Directions Recall", emoji: "➡️", difficulty: "hard", rewardMinutes: 13, description: "Repeat the flashed sequence of arrow directions." },
  { week: 46, id: "compare-numbers", title: "Compare Numbers", emoji: "🔼", difficulty: "easy", rewardMinutes: 7, description: "Click the bigger number, fast." },
  { week: 48, id: "divisibility-check", title: "Divisibility Check", emoji: "➗", difficulty: "medium", rewardMinutes: 9, description: "Judge whether a number is divisible by the divisor." },
  { week: 49, id: "shape-rotation", title: "Shape Rotation", emoji: "🔁", difficulty: "hard", rewardMinutes: 13, description: "Tell a rotated shape apart from a mirrored one." },
  { week: 50, id: "letter-count", title: "Letter Count", emoji: "🔍", difficulty: "medium", rewardMinutes: 9, description: "Click every occurrence of the target letter." },
  { week: 51, id: "word-association", title: "Word Association", emoji: "💭", difficulty: "easy", rewardMinutes: 8, description: "Pick the most related word." },
  { week: 52, id: "rapid-fire-facts", title: "Rapid Fire Facts", emoji: "⚡", difficulty: "medium", rewardMinutes: 9, description: "Type quick-fire general knowledge answers — the final drop of the year." },
];

const WEEKLY_MINIGAMES: GameDef[] = WEEKLY_MINIGAME_SPECS.map((s) => ({
  id: s.id,
  kind: "minigame",
  title: s.title,
  emoji: s.emoji,
  difficulty: s.difficulty,
  rewardMinutes: s.rewardMinutes,
  description: s.description,
  unlock: weeklyUnlock(s.week),
}));

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
  {
    id: "speed-math",
    kind: "minigame",
    title: "Speed Math",
    emoji: "🧮",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Solve arithmetic problems before time runs out.",
    unlock: { type: "trophies", tier: "any", count: 3 },
  },
  {
    id: "higher-lower",
    kind: "minigame",
    title: "Higher or Lower",
    emoji: "🎲",
    difficulty: "easy",
    rewardMinutes: 7,
    description: "Guess the hidden number within your limited guesses.",
    unlock: { type: "tasksCompleted", count: 15 },
  },
  {
    id: "color-match",
    kind: "minigame",
    title: "Color Match",
    emoji: "🌈",
    difficulty: "medium",
    rewardMinutes: 8,
    description: "Tap the color the word names, not the color it's written in.",
    unlock: { type: "focusHours", count: 15 },
  },
  {
    id: "slide-puzzle",
    kind: "minigame",
    title: "Slide Puzzle",
    emoji: "🔳",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Slide tiles to put the numbers back in order.",
    unlock: { type: "habitCheckIns", count: 25 },
  },
  {
    id: "minesweeper",
    kind: "minigame",
    title: "Minesweeper Mini",
    emoji: "💣",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Clear the board without hitting a mine.",
    unlock: { type: "gamesCompleted", ids: ["connect-four", "word-scramble"] },
  },
  {
    id: "typing-challenge",
    kind: "minigame",
    title: "Typing Challenge",
    emoji: "⌨️",
    difficulty: "medium",
    rewardMinutes: 9,
    description: "Type the sentence correctly before time runs out.",
    unlock: { type: "goalsCompleted", count: 3 },
  },
  ...WEEKLY_MINIGAMES,
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

// Losing costs a slice of what that item would have paid — steeper at
// higher difficulty since more was on the line. Only ever charged on a
// fresh (not-yet-solved) attempt; replaying something already solved is
// always reward-and-penalty-neutral.
export const FAILURE_PENALTY_PCT: Record<Difficulty, number> = {
  easy: 0.1,
  medium: 0.15,
  hard: 0.2,
};

export function failurePenalty(baseReward: number, difficulty: Difficulty): number {
  return Math.round(baseReward * FAILURE_PENALTY_PCT[difficulty]);
}

// Replaying an already-solved puzzle/riddle/IQ level/Q Mastered level (via
// the Completed tab) still pays a reduced reward — otherwise there'd be no
// point ever playing it back. Steeper tiers pay a bigger slice since more
// effort/skill was required the first time too.
export const REPLAY_REWARD_PCT: Record<Difficulty, number> = {
  easy: 0.25,
  medium: 0.3,
  hard: 0.35,
};

export function replayReward(baseReward: number, difficulty: Difficulty): number {
  return Math.round(baseReward * REPLAY_REWARD_PCT[difficulty]);
}

// --- IQ Levels: a 52-level progressive logic/puzzle track, inspired by (not
// copied from) Q Remastered's "draw anything, physics solves it" IQ-test
// mode. Levels 1-5 are always available; one more unlocks every Monday after
// that (level 6 = week 1 ... level 52 = week 47), reusing the same
// CONTENT_LAUNCH_DATE anchor as every other weekly drop. A small set of
// reusable "engine" mechanics gets reassigned across levels, each time with
// tougher parameters (grid size, obstacle count, time limit, ...) computed
// from the level number itself, so difficulty climbs level over level, not
// just band over band. No two consecutive levels reuse the same engine.
export type IQMechanic =
  | "drawPhysics"
  | "matrixReasoning"
  | "numberGridLogic"
  | "cubeNetMatch"
  | "analogySolver"
  | "weighingPuzzle"
  | "flowConnect"
  | "shapePacking"
  | "syllogismCheck"
  | "mirrorMatch"
  | "setDeduction"
  | "numberSeries"
  | "hiddenShape"
  | "logicGrid";

const IQ_MECHANIC_META: Record<IQMechanic, { title: string; emoji: string; description: string }> = {
  drawPhysics: { title: "Gravity Draw", emoji: "✏️", description: "Draw a line to guide the ball into the goal." },
  matrixReasoning: { title: "Matrix Reasoning", emoji: "🔳", description: "Pick the tile that completes the 3x3 pattern." },
  numberGridLogic: { title: "Number Grid", emoji: "🔢", description: "Work out the rule and fill in the missing number." },
  cubeNetMatch: { title: "Cube Net Match", emoji: "🎲", description: "Pick the cube that matches the unfolded net." },
  analogySolver: { title: "Analogy Solver", emoji: "🔗", description: "A is to B as C is to... pick the answer." },
  weighingPuzzle: { title: "Weighing Puzzle", emoji: "⚖️", description: "Find the odd one out using the balance scale." },
  flowConnect: { title: "Flow Connect", emoji: "🧵", description: "Connect matching dots without crossing any path." },
  shapePacking: { title: "Shape Packing", emoji: "🧩", description: "Fit every piece into the grid with no gaps." },
  syllogismCheck: { title: "Syllogism Check", emoji: "🗯️", description: "Decide whether the conclusion really follows." },
  mirrorMatch: { title: "Mirror Match", emoji: "🪞", description: "Pick the true mirror reflection of the shape." },
  setDeduction: { title: "Set Deduction", emoji: "🃏", description: "Pick the card that completes a valid set." },
  numberSeries: { title: "Number Series", emoji: "📈", description: "Crack the two interleaved rules in the sequence." },
  hiddenShape: { title: "Hidden Shape", emoji: "🔍", description: "Spot the target shape hiding in the figure." },
  logicGrid: { title: "Logic Grid", emoji: "🧠", description: "Use the clues to deduce the correct answer." },
};

// The level-by-level engine assignment (52 entries): three full round-robin
// passes through all 14 engines (levels 1-42), then a tail (levels 43-52)
// that spends down each engine's remaining reuse budget while still never
// repeating an engine back-to-back, ending on Logic Grid as the level-52
// finale.
const IQ_LEVEL_MECHANICS: IQMechanic[] = [
  "drawPhysics", "matrixReasoning", "numberGridLogic", "cubeNetMatch", "analogySolver", "weighingPuzzle", "flowConnect", "shapePacking", "syllogismCheck", "mirrorMatch", "setDeduction", "numberSeries", "hiddenShape", "logicGrid",
  "drawPhysics", "matrixReasoning", "numberGridLogic", "cubeNetMatch", "analogySolver", "weighingPuzzle", "flowConnect", "shapePacking", "syllogismCheck", "mirrorMatch", "setDeduction", "numberSeries", "hiddenShape", "logicGrid",
  "drawPhysics", "matrixReasoning", "numberGridLogic", "cubeNetMatch", "analogySolver", "weighingPuzzle", "flowConnect", "shapePacking", "syllogismCheck", "mirrorMatch", "setDeduction", "numberSeries", "hiddenShape", "logicGrid",
  "drawPhysics", "matrixReasoning", "numberGridLogic", "analogySolver", "drawPhysics", "flowConnect", "matrixReasoning", "syllogismCheck", "drawPhysics", "logicGrid",
];

function iqDifficulty(level: number): Difficulty {
  if (level <= 17) return "easy";
  if (level <= 35) return "medium";
  return "hard";
}

// Reward climbs gradually within each difficulty band so level 52 pays
// noticeably more than level 36, not just "hard" flat across 17 levels.
function iqRewardMinutes(level: number, difficulty: Difficulty): number {
  if (difficulty === "easy") return 8 + Math.floor((level - 1) / 5); // 8-11
  if (difficulty === "medium") return 12 + Math.floor((level - 18) / 4); // 12-16
  return 17 + Math.floor((level - 36) / 3); // 17-22
}

export const IQ_GAMES: GameDef[] = Array.from({ length: 52 }, (_, i) => {
  const level = i + 1;
  const meta = IQ_MECHANIC_META[IQ_LEVEL_MECHANICS[i]];
  const difficulty = iqDifficulty(level);
  return {
    id: `iq-level-${String(level).padStart(2, "0")}`,
    kind: "iq",
    title: `IQ Level ${level}: ${meta.title}`,
    emoji: meta.emoji,
    difficulty,
    rewardMinutes: iqRewardMinutes(level, difficulty),
    description: meta.description,
    unlock: level <= 5 ? undefined : weeklyUnlock(level - 5),
  };
});

// Looks up which engine (and level number) an "iq-level-NN" id maps to, so
// the detail page can dispatch to the right component without a 52-branch
// if/else chain.
export function iqLevelMechanic(id: string): { level: number; mechanic: IQMechanic } | undefined {
  const idx = IQ_GAMES.findIndex((g) => g.id === id);
  if (idx === -1) return undefined;
  return { level: idx + 1, mechanic: IQ_LEVEL_MECHANICS[idx] };
}

// --- Q Mastered Games: a 57-level track dedicated entirely to Q
// Remastered's core hook — freehand-draw a line and let gravity solve it —
// unlike the deliberately mixed IQ Levels track. Levels 1-5 are always
// available; starting the following Monday, one more unlocks every week for
// a full year (57 = 5 + 52). Variety comes from rotating through 4 sibling
// "draw and solve" goal types (never twice in a row) rather than from
// different mechanics altogether, since every level here is meant to feel
// like the same game, just a new stage — the way Q Remastered itself does
// across 1200+ stages.
export type QMasterMechanic = "guideBall" | "catchBall" | "blockBall" | "bridgeGap";

const QMASTER_MECHANIC_META: Record<QMasterMechanic, { title: string; emoji: string; description: string }> = {
  guideBall: { title: "Guide the Ball", emoji: "🎯", description: "Draw a path to guide the ball into the goal." },
  catchBall: { title: "Catch the Ball", emoji: "🥅", description: "Draw a shape to catch the falling ball before it drops." },
  blockBall: { title: "Block the Ball", emoji: "🧱", description: "Draw a wall to keep the ball away from the hazard." },
  bridgeGap: { title: "Bridge the Gap", emoji: "🌉", description: "Draw a bridge so the ball can cross the pit." },
};

const QMASTER_LEVEL_COUNT = 57;
const QMASTER_MECHANIC_ORDER: QMasterMechanic[] = ["guideBall", "catchBall", "blockBall", "bridgeGap"];

function qmasterDifficulty(level: number): Difficulty {
  if (level <= 19) return "easy";
  if (level <= 38) return "medium";
  return "hard";
}

function qmasterRewardMinutes(level: number, difficulty: Difficulty): number {
  if (difficulty === "easy") return 8 + Math.floor((level - 1) / 6); // 8-11
  if (difficulty === "medium") return 12 + Math.floor((level - 20) / 4); // 12-16
  return 17 + Math.floor((level - 39) / 3); // 17-23
}

export const QMASTER_GAMES: GameDef[] = Array.from({ length: QMASTER_LEVEL_COUNT }, (_, i) => {
  const level = i + 1;
  const mechanic = QMASTER_MECHANIC_ORDER[i % QMASTER_MECHANIC_ORDER.length];
  const meta = QMASTER_MECHANIC_META[mechanic];
  const difficulty = qmasterDifficulty(level);
  return {
    id: `qm-level-${String(level).padStart(2, "0")}`,
    kind: "qmaster",
    title: `Q Level ${level}: ${meta.title}`,
    emoji: meta.emoji,
    difficulty,
    rewardMinutes: qmasterRewardMinutes(level, difficulty),
    description: meta.description,
    unlock: level <= 5 ? undefined : weeklyUnlock(level - 5),
  };
});

// Looks up which goal-type (and level number) a "qm-level-NN" id maps to.
export function qmasterLevelMechanic(id: string): { level: number; mechanic: QMasterMechanic } | undefined {
  const idx = QMASTER_GAMES.findIndex((g) => g.id === id);
  if (idx === -1) return undefined;
  return { level: idx + 1, mechanic: QMASTER_MECHANIC_ORDER[idx % QMASTER_MECHANIC_ORDER.length] };
}

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

  // --- Weekly drops (odd weeks 1–51): one new puzzle every other week for a year ---
  {
    id: "puzzle-w1",
    kind: "puzzle",
    title: "The Missing Digit",
    emoji: "🔢",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 1 drop.",
    question: "A 3-digit number's digits are 4, 7, and x. The number is divisible by 9. What is x?",
    answers: ["7"],
    unlock: weeklyUnlock(1),
  },
  {
    id: "puzzle-w3",
    kind: "puzzle",
    title: "The Frog in the Well",
    emoji: "🐸",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 3 drop.",
    question:
      "A frog at the bottom of a 30-foot well climbs 3 feet up each day but slips back 2 feet each night. How many days does it take to reach the top?",
    answers: ["28"],
    unlock: weeklyUnlock(3),
  },
  {
    id: "puzzle-w5",
    kind: "puzzle",
    title: "The Ages Puzzle",
    emoji: "🎂",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 5 drop.",
    question:
      "A father is 4 times as old as his son. In 20 years, he will be twice as old as his son. How old is the son now?",
    answers: ["10"],
    unlock: weeklyUnlock(5),
  },
  {
    id: "puzzle-w7",
    kind: "puzzle",
    title: "The Race Positions",
    emoji: "🏃",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 7 drop.",
    question: "In a race, you overtake the runner in 2nd place. What place are you in now?",
    answers: ["2nd", "second", "2"],
    unlock: weeklyUnlock(7),
  },
  {
    id: "puzzle-w9",
    kind: "puzzle",
    title: "The Product Riddle",
    emoji: "✖️",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 9 drop.",
    question: "Two numbers multiply to 36 and add to 13. What is the larger number?",
    answers: ["9"],
    unlock: weeklyUnlock(9),
  },
  {
    id: "puzzle-w11",
    kind: "puzzle",
    title: "The Chessboard Squares",
    emoji: "♟️",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 11 drop.",
    question: "How many total squares of all sizes (1x1 up to 8x8) are on a standard 8x8 chessboard?",
    answers: ["204"],
    unlock: weeklyUnlock(11),
  },
  {
    id: "puzzle-w13",
    kind: "puzzle",
    title: "The Snail and the Pole",
    emoji: "🐌",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 13 drop.",
    question:
      "A snail climbs a 10-meter pole. Each day it climbs 3 meters, and each night it slips back 1 meter. On which day does it first reach the top?",
    answers: ["5"],
    unlock: weeklyUnlock(13),
  },
  {
    id: "puzzle-w15",
    kind: "puzzle",
    title: "The Dice Sum",
    emoji: "🎲",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 15 drop.",
    question: "You roll two standard six-sided dice. In how many different ways can you roll a sum of 7?",
    answers: ["6"],
    unlock: weeklyUnlock(15),
  },
  {
    id: "puzzle-w17",
    kind: "puzzle",
    title: "The Painted Cube",
    emoji: "🎨",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 17 drop.",
    question:
      "A 3x3x3 cube made of 27 unit cubes is painted red on all outer faces, then disassembled. How many unit cubes have exactly 2 painted faces?",
    answers: ["12"],
    unlock: weeklyUnlock(17),
  },
  {
    id: "puzzle-w19",
    kind: "puzzle",
    title: "The Consecutive Integers",
    emoji: "🔗",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 19 drop.",
    question: "Three consecutive integers add up to 96. What is the smallest of the three?",
    answers: ["31"],
    unlock: weeklyUnlock(19),
  },
  {
    id: "puzzle-w21",
    kind: "puzzle",
    title: "The Ladder Problem",
    emoji: "🪜",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 21 drop.",
    question:
      "A 25-foot ladder leans against a wall with its base 7 feet from the wall. How many feet up the wall does the ladder reach?",
    answers: ["24"],
    unlock: weeklyUnlock(21),
  },
  {
    id: "puzzle-w23",
    kind: "puzzle",
    title: "The Class Average",
    emoji: "📊",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 23 drop.",
    question:
      "A class of 20 students has an average score of 75. One student's score is corrected from 60 to 90. What is the new class average?",
    answers: ["76.5"],
    unlock: weeklyUnlock(23),
  },
  {
    id: "puzzle-w25",
    kind: "puzzle",
    title: "The Coin Flip Streak",
    emoji: "🪙",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 25 drop.",
    question: "You flip a fair coin 4 times. How many of the 16 possible outcomes contain at least one heads?",
    answers: ["15"],
    unlock: weeklyUnlock(25),
  },
  {
    id: "puzzle-w27",
    kind: "puzzle",
    title: "The Rectangle's Width",
    emoji: "📐",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 27 drop.",
    question: "A rectangle's length is twice its width. Its perimeter is 60. What is its width?",
    answers: ["10"],
    unlock: weeklyUnlock(27),
  },
  {
    id: "puzzle-w29",
    kind: "puzzle",
    title: "The GCD Puzzle",
    emoji: "🔢",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 29 drop.",
    question: "What is the greatest common divisor of 48 and 180?",
    answers: ["12"],
    unlock: weeklyUnlock(29),
  },
  {
    id: "puzzle-w31",
    kind: "puzzle",
    title: "The Interest Problem",
    emoji: "💰",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 31 drop.",
    question: "$1000 is invested at 10% simple annual interest. How many dollars of interest accrue after 3 years?",
    answers: ["300"],
    unlock: weeklyUnlock(31),
  },
  {
    id: "puzzle-w33",
    kind: "puzzle",
    title: "The Only Even Prime",
    emoji: "🔍",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 33 drop.",
    question: "What is the only even prime number?",
    answers: ["2"],
    unlock: weeklyUnlock(33),
  },
  {
    id: "puzzle-w35",
    kind: "puzzle",
    title: "The Factorial Zeros",
    emoji: "❗",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 35 drop.",
    question: "How many trailing zeros are in 10! (10 factorial, i.e. 10×9×8×...×1)?",
    answers: ["2"],
    unlock: weeklyUnlock(35),
  },
  {
    id: "puzzle-w37",
    kind: "puzzle",
    title: "The Square Root",
    emoji: "√",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 37 drop.",
    question: "What is the square root of 1444?",
    answers: ["38"],
    unlock: weeklyUnlock(37),
  },
  {
    id: "puzzle-w39",
    kind: "puzzle",
    title: "The Hexagon's Angles",
    emoji: "🔷",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 39 drop.",
    question: "What is the sum of the interior angles of a hexagon (6 sides), in degrees?",
    answers: ["720"],
    unlock: weeklyUnlock(39),
  },
  {
    id: "puzzle-w41",
    kind: "puzzle",
    title: "The Speed Average",
    emoji: "🚗",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 41 drop.",
    question:
      "A car travels 60 miles at 30 mph, then another 60 miles at 60 mph. What is its average speed for the whole trip, in mph?",
    answers: ["40"],
    unlock: weeklyUnlock(41),
  },
  {
    id: "puzzle-w43",
    kind: "puzzle",
    title: "The Power of Two",
    emoji: "🔟",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 43 drop.",
    question: "What is the sum of the digits of 2 to the power of 10 (1024)?",
    answers: ["7"],
    unlock: weeklyUnlock(43),
  },
  {
    id: "puzzle-w45",
    kind: "puzzle",
    title: "The Pigeonhole Principle",
    emoji: "🕊️",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 45 drop.",
    question:
      "If you put 13 pigeons into 12 pigeonholes, what is the minimum number of pigeons guaranteed to share at least one hole?",
    answers: ["2"],
    unlock: weeklyUnlock(45),
  },
  {
    id: "puzzle-w47",
    kind: "puzzle",
    title: "The Double Discount",
    emoji: "🏷️",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 47 drop.",
    question:
      "An item costs $80. It's discounted 25%, then that new price is discounted another 10%. What is the final price in dollars?",
    answers: ["54"],
    unlock: weeklyUnlock(47),
  },
  {
    id: "puzzle-w49",
    kind: "puzzle",
    title: "The Triangular Number",
    emoji: "🔺",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 49 drop.",
    question: "What is the 10th triangular number (1+2+3+...+10)?",
    answers: ["55"],
    unlock: weeklyUnlock(49),
  },
  {
    id: "puzzle-w51",
    kind: "puzzle",
    title: "The Anniversary Puzzle",
    emoji: "🎉",
    difficulty: "hard",
    rewardMinutes: 16,
    description: "Week 51 drop — nearly a full year in.",
    question:
      "How many total minutes are in exactly one full week (7 days), expressed as a single number?",
    answers: ["10080"],
    unlock: weeklyUnlock(51),
  },

  // --- Weekly drops (even weeks 2–52): a puzzle now drops the SAME week as
  // the riddle below, so every week gets one of each, not alternating. ---
  {
    id: "puzzle-w2",
    kind: "puzzle",
    title: "The Birthday Pairs",
    emoji: "🎂",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 2 drop.",
    question: "In a room of 5 people, how many unique pairs of people are there to compare birthdays?",
    answers: ["10"],
    unlock: weeklyUnlock(2),
  },
  {
    id: "puzzle-w4",
    kind: "puzzle",
    title: "The Square Garden",
    emoji: "🟩",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 4 drop.",
    question: "A square garden has an area of 169 square meters. What is the length of one side, in meters?",
    answers: ["13"],
    unlock: weeklyUnlock(4),
  },
  {
    id: "puzzle-w6",
    kind: "puzzle",
    title: "The Bus Schedule",
    emoji: "🚌",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 6 drop.",
    question: "A bus leaves every 12 minutes from a station. If one just left, in how many minutes does the 5th bus after that leave?",
    answers: ["60"],
    unlock: weeklyUnlock(6),
  },
  {
    id: "puzzle-w8",
    kind: "puzzle",
    title: "The Sum of Twenty",
    emoji: "➕",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 8 drop.",
    question: "What is the sum of all integers from 1 to 20?",
    answers: ["210"],
    unlock: weeklyUnlock(8),
  },
  {
    id: "puzzle-w10",
    kind: "puzzle",
    title: "The Vowel Count",
    emoji: "🔤",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 10 drop.",
    question: "How many vowels (A, E, I, O, U) are in the word EDUCATION?",
    answers: ["5"],
    unlock: weeklyUnlock(10),
  },
  {
    id: "puzzle-w12",
    kind: "puzzle",
    title: "The Water Tank",
    emoji: "💧",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 12 drop.",
    question:
      "A tank is 40% full of water. Adding 24 liters makes it 70% full. What is the tank's total capacity, in liters?",
    answers: ["80"],
    unlock: weeklyUnlock(12),
  },
  {
    id: "puzzle-w14",
    kind: "puzzle",
    title: "The Digit Sum Match",
    emoji: "🔢",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 14 drop.",
    question:
      "A two-digit number between 20 and 30 equals exactly 3 times the sum of its digits. What is the number?",
    answers: ["27"],
    unlock: weeklyUnlock(14),
  },
  {
    id: "puzzle-w16",
    kind: "puzzle",
    title: "The Missing Term",
    emoji: "🔗",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 16 drop.",
    question: "What comes next in the sequence: 2, 6, 12, 20, 30, ?",
    answers: ["42"],
    unlock: weeklyUnlock(16),
  },
  {
    id: "puzzle-w18",
    kind: "puzzle",
    title: "The Price Increase",
    emoji: "🏷️",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 18 drop.",
    question: "A price increases from $40 to $50. What is the percentage increase?",
    answers: ["25"],
    unlock: weeklyUnlock(18),
  },
  {
    id: "puzzle-w20",
    kind: "puzzle",
    title: "The Right Triangle",
    emoji: "📐",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 20 drop.",
    question: "A right triangle has legs 9 and 12. What is the length of the hypotenuse?",
    answers: ["15"],
    unlock: weeklyUnlock(20),
  },
  {
    id: "puzzle-w22",
    kind: "puzzle",
    title: "The Combination Lock",
    emoji: "🔐",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 22 drop.",
    question: "A combination lock has 3 dials, each with digits 0-9. How many total possible combinations are there?",
    answers: ["1000"],
    unlock: weeklyUnlock(22),
  },
  {
    id: "puzzle-w24",
    kind: "puzzle",
    title: "The Work Rate",
    emoji: "👷",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 24 drop.",
    question: "It takes 6 workers 8 days to build a wall. How many days would 12 workers take, at the same rate?",
    answers: ["4"],
    unlock: weeklyUnlock(24),
  },
  {
    id: "puzzle-w26",
    kind: "puzzle",
    title: "The Palindrome Year",
    emoji: "🔁",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 26 drop — half a year in.",
    question: "What is the next palindrome year after 2002 (a year that reads the same forwards and backwards)?",
    answers: ["2112"],
    unlock: weeklyUnlock(26),
  },
  {
    id: "puzzle-w28",
    kind: "puzzle",
    title: "The Cube's Volume",
    emoji: "🧊",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "Week 28 drop.",
    question: "A cube has a side length of 5cm. What is its volume in cubic centimeters?",
    answers: ["125"],
    unlock: weeklyUnlock(28),
  },
  {
    id: "puzzle-w30",
    kind: "puzzle",
    title: "The Uneven Order",
    emoji: "🍽️",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 30 drop.",
    question:
      "3 friends split a $90 bill, but one ordered half as much as the other two (who ordered equal amounts, cost proportional to order). How many dollars does the lighter eater pay?",
    answers: ["18"],
    unlock: weeklyUnlock(30),
  },
  {
    id: "puzzle-w32",
    kind: "puzzle",
    title: "The Prime Check",
    emoji: "🔍",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 32 drop.",
    question: "Which of these is prime: 51, 57, 59, or 63?",
    answers: ["59"],
    unlock: weeklyUnlock(32),
  },
  {
    id: "puzzle-w34",
    kind: "puzzle",
    title: "The Exponent Puzzle",
    emoji: "🔟",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 34 drop.",
    question: "What is 3 to the power of 4 (3^4)?",
    answers: ["81"],
    unlock: weeklyUnlock(34),
  },
  {
    id: "puzzle-w36",
    kind: "puzzle",
    title: "The Middle Value",
    emoji: "📊",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 36 drop.",
    question: "What is the median of the numbers 7, 2, 9, 4, 11?",
    answers: ["7"],
    unlock: weeklyUnlock(36),
  },
  {
    id: "puzzle-w38",
    kind: "puzzle",
    title: "The Marble Bag",
    emoji: "🔴",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 38 drop.",
    question: "A bag has 4 red and 6 blue marbles. As a simplified fraction, what's the probability of drawing red?",
    answers: ["2/5"],
    unlock: weeklyUnlock(38),
  },
  {
    id: "puzzle-w40",
    kind: "puzzle",
    title: "The Fence Posts",
    emoji: "🪵",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 40 drop.",
    question:
      "A straight fence is 100 meters long, with posts every 10 meters, including both ends. How many posts are there?",
    answers: ["11"],
    unlock: weeklyUnlock(40),
  },
  {
    id: "puzzle-w42",
    kind: "puzzle",
    title: "The Angle Ratio",
    emoji: "📐",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 42 drop.",
    question: "A triangle has angles in the ratio 2:3:4. What is the largest angle, in degrees?",
    answers: ["80"],
    unlock: weeklyUnlock(42),
  },
  {
    id: "puzzle-w44",
    kind: "puzzle",
    title: "The Binary Conversion",
    emoji: "🖥️",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 44 drop.",
    question: "What is 25 (base 10) written in binary?",
    answers: ["11001"],
    unlock: weeklyUnlock(44),
  },
  {
    id: "puzzle-w46",
    kind: "puzzle",
    title: "The Removed Average",
    emoji: "➖",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 46 drop.",
    question:
      "The average of 5 numbers is 20. If one number is removed, the average of the remaining 4 is 18. What was the removed number?",
    answers: ["28"],
    unlock: weeklyUnlock(46),
  },
  {
    id: "puzzle-w48",
    kind: "puzzle",
    title: "The Ratio Split",
    emoji: "💵",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 48 drop.",
    question: "A sum of $120 is divided between two people in the ratio 3:5. How many dollars does the smaller share get?",
    answers: ["45"],
    unlock: weeklyUnlock(48),
  },
  {
    id: "puzzle-w50",
    kind: "puzzle",
    title: "The Growth Rate",
    emoji: "📈",
    difficulty: "hard",
    rewardMinutes: 14,
    description: "Week 50 drop.",
    question: "A population doubles every 5 years. If it starts at 100, what will it be after 20 years?",
    answers: ["1600"],
    unlock: weeklyUnlock(50),
  },
  {
    id: "puzzle-w52",
    kind: "puzzle",
    title: "The Grand Finale",
    emoji: "🏁",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "Week 52 drop — the final one of the year.",
    question: "What is 12 squared minus 5 squared?",
    answers: ["119"],
    unlock: weeklyUnlock(52),
  },

  // --- Bonus puzzles: unlocked by effort, not the calendar ---
  {
    id: "puzzle-b1",
    kind: "puzzle",
    title: "The Day of the Week",
    emoji: "📅",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "If today is Wednesday, what day of the week will it be in 100 days? (full word)",
    answers: ["friday"],
    unlock: { type: "tasksCompleted", count: 15 },
  },
  {
    id: "puzzle-b2",
    kind: "puzzle",
    title: "The Nearest Square",
    emoji: "🔲",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "A bonus challenge.",
    question: "What is the smallest perfect square greater than 200?",
    answers: ["225"],
    unlock: { type: "goalsCompleted", count: 3 },
  },
  {
    id: "puzzle-b3",
    kind: "puzzle",
    title: "The Three Switches",
    emoji: "💡",
    difficulty: "hard",
    rewardMinutes: 16,
    description: "A bonus challenge.",
    question:
      "Three switches downstairs each might control one bulb upstairs; only one really does. You may flip switches any way you like, but can only go upstairs once to check. Using the bulb's heat as a clue, how many of the three switches should you leave ON when you finally head upstairs?",
    answers: ["1"],
    unlock: { type: "habitCheckIns", count: 15 },
  },
  {
    id: "puzzle-b4",
    kind: "puzzle",
    title: "The Book's Pages",
    emoji: "📖",
    difficulty: "hard",
    rewardMinutes: 16,
    description: "A bonus challenge.",
    question:
      "A book's pages are numbered starting from 1. Printing every page number used exactly 189 digits in total. How many pages does the book have?",
    answers: ["99"],
    unlock: { type: "focusHours", count: 15 },
  },
  {
    id: "puzzle-b5",
    kind: "puzzle",
    title: "The Closing Trains",
    emoji: "🚄",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "A bonus challenge.",
    question:
      "Two trains start 240 miles apart and move toward each other, one at 50 mph, one at 70 mph. How many hours until they meet?",
    answers: ["2"],
    unlock: { type: "trophies", tier: "silver", count: 1 },
  },
  {
    id: "puzzle-b6",
    kind: "puzzle",
    title: "The Digital Root",
    emoji: "🔁",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question:
      "Sum the digits of 999999999 (nine 9s). Then sum the digits of that result. Keep going until you get a single digit. What is it?",
    answers: ["9"],
    unlock: { type: "gamesCompleted", ids: ["rps"] },
  },
  {
    id: "puzzle-b7",
    kind: "puzzle",
    title: "The Chocolate Bar",
    emoji: "🍫",
    difficulty: "medium",
    rewardMinutes: 12,
    description: "A bonus challenge.",
    question:
      "A chocolate bar is a 6x4 grid of 24 small squares. Each break splits exactly one piece into two. How many total breaks does it take to separate it into all 24 individual squares?",
    answers: ["23"],
    unlock: { type: "achievement", id: "habit-streak-7" },
  },
  {
    id: "puzzle-b8",
    kind: "puzzle",
    title: "The Two-Heads Probability",
    emoji: "🎯",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "You flip a fair coin 3 times. As a simplified fraction, what's the probability of exactly 2 heads?",
    answers: ["3/8"],
    unlock: { type: "tasksCompleted", count: 30 },
  },
  {
    id: "puzzle-b9",
    kind: "puzzle",
    title: "The Pool Lengths",
    emoji: "🏊",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "A bonus challenge.",
    question:
      "A swimming pool is 50m long. A swimmer swims 3 lengths in one direction and 2 lengths back. How many meters total did they swim?",
    answers: ["250"],
    unlock: { type: "goalsCompleted", count: 4 },
  },
  {
    id: "puzzle-b10",
    kind: "puzzle",
    title: "The Smallest Multiple",
    emoji: "➗",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "What is the smallest positive integer divisible by all of 2, 3, 4, 5, and 6?",
    answers: ["60"],
    unlock: { type: "habitCheckIns", count: 60 },
  },
  {
    id: "puzzle-b11",
    kind: "puzzle",
    title: "The Uneven Split Bill",
    emoji: "🧾",
    difficulty: "hard",
    rewardMinutes: 16,
    description: "A bonus challenge.",
    question:
      "A bill of $84 is normally split evenly among 7 friends, but 2 friends can't pay. How many more dollars does each of the remaining 5 have to contribute to fully cover the bill (compared to their original $12 share)?",
    answers: ["4.8"],
    unlock: { type: "focusHours", count: 30 },
  },
  {
    id: "puzzle-b12",
    kind: "puzzle",
    title: "The Binary Number",
    emoji: "🖥️",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "What is the decimal value of the binary number 101010?",
    answers: ["42"],
    unlock: { type: "trophies", tier: "any", count: 8 },
  },
  {
    id: "puzzle-b13",
    kind: "puzzle",
    title: "The Half Lap",
    emoji: "🏟️",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "A bonus challenge.",
    question:
      "A runner completes one lap of a 400m circular track in 80 seconds at constant speed. How many seconds does it take to run half the track?",
    answers: ["40"],
    unlock: { type: "gamesCompleted", ids: ["speed-math", "higher-lower"] },
  },
  {
    id: "puzzle-b14",
    kind: "puzzle",
    title: "The Odd Sum",
    emoji: "➕",
    difficulty: "easy",
    rewardMinutes: 8,
    description: "A bonus challenge.",
    question: "What is the sum of the first 10 odd numbers (1+3+5+...+19)?",
    answers: ["100"],
    unlock: { type: "achievement", id: "goals-1" },
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

  // --- Weekly drops (even weeks 2–52): one new riddle every other week for a year ---
  {
    id: "riddle-w2",
    kind: "riddle",
    title: "Face and Hands",
    emoji: "🕐",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 2 drop.",
    question: "What has a face and two hands, but no arms or legs?",
    answers: ["clock", "a clock"],
    unlock: weeklyUnlock(2),
  },
  {
    id: "riddle-w4",
    kind: "riddle",
    title: "Filling a Room",
    emoji: "💡",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 4 drop.",
    question: "What can fill a room but takes up no space?",
    answers: ["light", "a light"],
    unlock: weeklyUnlock(4),
  },
  {
    id: "riddle-w6",
    kind: "riddle",
    title: "Words, No Voice",
    emoji: "📖",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 6 drop.",
    question: "What has words but never speaks?",
    answers: ["book", "a book"],
    unlock: weeklyUnlock(6),
  },
  {
    id: "riddle-w8",
    kind: "riddle",
    title: "Falling Never Rising",
    emoji: "🌧️",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 8 drop.",
    question: "What comes down but never goes back up?",
    answers: ["rain"],
    unlock: weeklyUnlock(8),
  },
  {
    id: "riddle-w10",
    kind: "riddle",
    title: "Legs, No Walking",
    emoji: "🪑",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 10 drop.",
    question: "What has legs but cannot walk?",
    answers: ["table", "a table"],
    unlock: weeklyUnlock(10),
  },
  {
    id: "riddle-w12",
    kind: "riddle",
    title: "Wetter as It Dries",
    emoji: "🧻",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 12 drop.",
    question: "What gets wetter the more it dries?",
    answers: ["towel", "a towel"],
    unlock: weeklyUnlock(12),
  },
  {
    id: "riddle-w14",
    kind: "riddle",
    title: "Teeth, No Bite",
    emoji: "💇",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 14 drop.",
    question: "What has teeth but cannot bite?",
    answers: ["comb", "a comb"],
    unlock: weeklyUnlock(14),
  },
  {
    id: "riddle-w16",
    kind: "riddle",
    title: "Head and Tail",
    emoji: "🪙",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 16 drop.",
    question: "What has a head and a tail but no body?",
    answers: ["coin", "a coin"],
    unlock: weeklyUnlock(16),
  },
  {
    id: "riddle-w18",
    kind: "riddle",
    title: "Look Through a Wall",
    emoji: "🪟",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 18 drop.",
    question: "What invention lets you look right through a wall?",
    answers: ["window", "a window"],
    unlock: weeklyUnlock(18),
  },
  {
    id: "riddle-w20",
    kind: "riddle",
    title: "Full of Holes",
    emoji: "🧽",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 20 drop.",
    question: "What is full of holes but still holds water?",
    answers: ["sponge", "a sponge"],
    unlock: weeklyUnlock(20),
  },
  {
    id: "riddle-w22",
    kind: "riddle",
    title: "No Doors or Windows",
    emoji: "🍄",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 22 drop.",
    question: "What kind of room has no doors or windows?",
    answers: ["mushroom", "a mushroom"],
    unlock: weeklyUnlock(22),
  },
  {
    id: "riddle-w24",
    kind: "riddle",
    title: "Broken by a Word",
    emoji: "🤫",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 24 drop.",
    question: "What is so fragile that saying its name breaks it?",
    answers: ["silence"],
    unlock: weeklyUnlock(24),
  },
  {
    id: "riddle-w26",
    kind: "riddle",
    title: "Broken Without Touching",
    emoji: "🤝",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 26 drop — half a year in.",
    question: "What can you break without ever touching it?",
    answers: ["promise", "a promise"],
    unlock: weeklyUnlock(26),
  },
  {
    id: "riddle-w28",
    kind: "riddle",
    title: "A Ring With No Finger",
    emoji: "☎️",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 28 drop.",
    question: "What has a ring but no finger?",
    answers: ["telephone", "a telephone", "phone"],
    unlock: weeklyUnlock(28),
  },
  {
    id: "riddle-w30",
    kind: "riddle",
    title: "Head, Foot, Four Legs",
    emoji: "🛏️",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 30 drop.",
    question: "What has a head, a foot, and four legs, but is not alive?",
    answers: ["bed", "a bed"],
    unlock: weeklyUnlock(30),
  },
  {
    id: "riddle-w32",
    kind: "riddle",
    title: "The Building of Stories",
    emoji: "📚",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 32 drop.",
    question: "What building has the most stories, yet no one lives in any of them?",
    answers: ["library", "a library"],
    unlock: weeklyUnlock(32),
  },
  {
    id: "riddle-w34",
    kind: "riddle",
    title: "A Tree in Your Hand",
    emoji: "🌴",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 34 drop.",
    question: "What kind of tree can you carry in your hand?",
    answers: ["palm", "a palm", "palm tree", "a palm tree"],
    unlock: weeklyUnlock(34),
  },
  {
    id: "riddle-w36",
    kind: "riddle",
    title: "Through Cities, Never Moving",
    emoji: "🛣️",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 36 drop.",
    question: "What goes through cities and fields but never moves itself?",
    answers: ["road", "a road"],
    unlock: weeklyUnlock(36),
  },
  {
    id: "riddle-w38",
    kind: "riddle",
    title: "Ear to Ear",
    emoji: "😊",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 38 drop.",
    question: "What can travel from ear to ear without ever moving?",
    answers: ["smile", "a smile"],
    unlock: weeklyUnlock(38),
  },
  {
    id: "riddle-w40",
    kind: "riddle",
    title: "Always Coming",
    emoji: "🌅",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 40 drop.",
    question: "What is always coming but never actually arrives?",
    answers: ["tomorrow"],
    unlock: weeklyUnlock(40),
  },
  {
    id: "riddle-w42",
    kind: "riddle",
    title: "Cracked, Made, Told",
    emoji: "😂",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 42 drop.",
    question: "What can be cracked, made, told, and played?",
    answers: ["joke", "a joke"],
    unlock: weeklyUnlock(42),
  },
  {
    id: "riddle-w44",
    kind: "riddle",
    title: "A Heart, No Organs",
    emoji: "🃏",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 44 drop.",
    question: "What has a heart, but no other organs at all?",
    answers: ["deck of cards", "a deck of cards", "cards"],
    unlock: weeklyUnlock(44),
  },
  {
    id: "riddle-w46",
    kind: "riddle",
    title: "T at Both Ends",
    emoji: "🫖",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 46 drop.",
    question: "What starts with T, ends with T, and has T inside it?",
    answers: ["teapot", "a teapot"],
    unlock: weeklyUnlock(46),
  },
  {
    id: "riddle-w48",
    kind: "riddle",
    title: "Keep It After Giving It",
    emoji: "🗣️",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 48 drop.",
    question: "What can you keep even after you give it to someone else?",
    answers: ["word", "your word"],
    unlock: weeklyUnlock(48),
  },
  {
    id: "riddle-w50",
    kind: "riddle",
    title: "Rings With No Fingers",
    emoji: "🌳",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 50 drop.",
    question: "What has many rings but no fingers?",
    answers: ["tree", "a tree"],
    unlock: weeklyUnlock(50),
  },
  {
    id: "riddle-w52",
    kind: "riddle",
    title: "Easy In, Hard Out",
    emoji: "😬",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "Week 52 drop — the final one of the year.",
    question: "What is easy to get into but hard to get out of?",
    answers: ["trouble"],
    unlock: weeklyUnlock(52),
  },

  // --- Weekly drops (odd weeks 1–51): a riddle now drops the SAME week as
  // the puzzle above, so every week gets one of each, not alternating. ---
  {
    id: "riddle-w1",
    kind: "riddle",
    title: "Four Legs, Two Legs, Three Legs",
    emoji: "🦉",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 1 drop.",
    question:
      "What walks on four legs in the morning, two legs at noon, and three legs in the evening?",
    answers: ["man", "a man", "human", "a human"],
    unlock: weeklyUnlock(1),
  },
  {
    id: "riddle-w3",
    kind: "riddle",
    title: "Endless Letters",
    emoji: "🔤",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 3 drop.",
    question: "What has an endless supply of letters but no mailbox?",
    answers: ["alphabet", "the alphabet"],
    unlock: weeklyUnlock(3),
  },
  {
    id: "riddle-w5",
    kind: "riddle",
    title: "Never Bites",
    emoji: "🌭",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 5 drop.",
    question: "What kind of dog never bites?",
    answers: ["hot dog", "a hot dog"],
    unlock: weeklyUnlock(5),
  },
  {
    id: "riddle-w7",
    kind: "riddle",
    title: "An Army With No Weapons",
    emoji: "🐜",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 7 drop.",
    question: "What has an army but no weapons, and marches but never walks?",
    answers: ["ants", "an army of ants"],
    unlock: weeklyUnlock(7),
  },
  {
    id: "riddle-w9",
    kind: "riddle",
    title: "There When the Sun Shines",
    emoji: "🌑",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 9 drop.",
    question: "What can you not touch or hold, but is always there whenever the sun shines?",
    answers: ["shadow", "a shadow"],
    unlock: weeklyUnlock(9),
  },
  {
    id: "riddle-w11",
    kind: "riddle",
    title: "Surrounds a House",
    emoji: "🚧",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 11 drop.",
    question: "What surrounds a house without ever moving or being alive?",
    answers: ["fence", "a fence"],
    unlock: weeklyUnlock(11),
  },
  {
    id: "riddle-w13",
    kind: "riddle",
    title: "A Tongue That Cannot Talk",
    emoji: "👞",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 13 drop.",
    question: "What has a tongue but cannot talk, and soles but never walks on its own?",
    answers: ["shoe", "a shoe"],
    unlock: weeklyUnlock(13),
  },
  {
    id: "riddle-w15",
    kind: "riddle",
    title: "Keep It Only By Giving",
    emoji: "🤐",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 15 drop.",
    question: "What can you not keep, until you have given it away to someone else?",
    answers: ["secret", "a secret"],
    unlock: weeklyUnlock(15),
  },
  {
    id: "riddle-w17",
    kind: "riddle",
    title: "Shorter With More Letters",
    emoji: "📏",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 17 drop.",
    question: "What five-letter word means \"not tall\", and still describes itself even with two more letters added to the end?",
    answers: ["short"],
    unlock: weeklyUnlock(17),
  },
  {
    id: "riddle-w19",
    kind: "riddle",
    title: "Heavy Forward, Not Backward",
    emoji: "🔡",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "Week 19 drop.",
    question: "What three-letter word means heavy or large, but spelled backward means \"not\"?",
    answers: ["ton"],
    unlock: weeklyUnlock(19),
  },
  {
    id: "riddle-w21",
    kind: "riddle",
    title: "A Coin for Bravery",
    emoji: "🎖️",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 21 drop.",
    question: "What kind of round metal disc can't be spent, but is given out for bravery or victory?",
    answers: ["medal", "a medal"],
    unlock: weeklyUnlock(21),
  },
  {
    id: "riddle-w23",
    kind: "riddle",
    title: "A Nut With No Shell",
    emoji: "🍩",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 23 drop.",
    question: "What kind of \"nut\" can't be cracked, and has a hole in the middle?",
    answers: ["doughnut", "a doughnut", "donut", "a donut"],
    unlock: weeklyUnlock(23),
  },
  {
    id: "riddle-w25",
    kind: "riddle",
    title: "A Ball That Doesn't Bounce",
    emoji: "👁️",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 25 drop.",
    question: "What kind of ball doesn't bounce, and you have two of, one in each socket?",
    answers: ["eyeball", "an eyeball"],
    unlock: weeklyUnlock(25),
  },
  {
    id: "riddle-w27",
    kind: "riddle",
    title: "Bought by the Yard",
    emoji: "🧵",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 27 drop.",
    question: "What is bought by the yard, but worn by the foot?",
    answers: ["carpet", "a carpet"],
    unlock: weeklyUnlock(27),
  },
  {
    id: "riddle-w29",
    kind: "riddle",
    title: "A Cap Never Worn",
    emoji: "🚗",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 29 drop.",
    question: "What kind of cap is never worn on a head?",
    answers: ["hubcap", "a hubcap"],
    unlock: weeklyUnlock(29),
  },
  {
    id: "riddle-w31",
    kind: "riddle",
    title: "Up When Rain Comes Down",
    emoji: "☔",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 31 drop.",
    question: "What goes up when the rain comes down?",
    answers: ["umbrella", "an umbrella"],
    unlock: weeklyUnlock(31),
  },
  {
    id: "riddle-w33",
    kind: "riddle",
    title: "Spelled Wrong Everywhere",
    emoji: "📔",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "Week 33 drop.",
    question: "What word is spelled incorrectly in every single dictionary in the world?",
    answers: ["incorrectly"],
    unlock: weeklyUnlock(33),
  },
  {
    id: "riddle-w35",
    kind: "riddle",
    title: "A Golden Crown in the Orchard",
    emoji: "🍍",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 35 drop.",
    question: "What fruit wears a golden crown and grows close to the ground in tropical fields?",
    answers: ["pineapple", "a pineapple"],
    unlock: weeklyUnlock(35),
  },
  {
    id: "riddle-w37",
    kind: "riddle",
    title: "Shoes for Spies",
    emoji: "👟",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 37 drop.",
    question: "What kind of shoes do all spies secretly wear?",
    answers: ["sneakers"],
    unlock: weeklyUnlock(37),
  },
  {
    id: "riddle-w39",
    kind: "riddle",
    title: "Shorter as It Grows",
    emoji: "🕯️",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 39 drop.",
    question: "What gets shorter the older it grows, and dies the moment it stops burning?",
    answers: ["candle", "a candle"],
    unlock: weeklyUnlock(39),
  },
  {
    id: "riddle-w41",
    kind: "riddle",
    title: "A Face That Never Lies",
    emoji: "🪞",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 41 drop.",
    question: "What shows you a face that isn't really there, and never lies about what it sees?",
    answers: ["mirror", "a mirror"],
    unlock: weeklyUnlock(41),
  },
  {
    id: "riddle-w43",
    kind: "riddle",
    title: "A Bow That Can't Be Tied",
    emoji: "🌈",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 43 drop.",
    question: "What kind of bow can't be tied?",
    answers: ["rainbow", "a rainbow"],
    unlock: weeklyUnlock(43),
  },
  {
    id: "riddle-w45",
    kind: "riddle",
    title: "No Bones, Holds Your Head",
    emoji: "🛌",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "Week 45 drop.",
    question: "What holds your head up at night, but has no bones of its own?",
    answers: ["pillow", "a pillow"],
    unlock: weeklyUnlock(45),
  },
  {
    id: "riddle-w47",
    kind: "riddle",
    title: "An Eye Over the Ocean",
    emoji: "🌀",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "Week 47 drop.",
    question: "What has an eye but lives in the sky, and spins dangerously over the ocean?",
    answers: ["hurricane", "a hurricane"],
    unlock: weeklyUnlock(47),
  },
  {
    id: "riddle-w49",
    kind: "riddle",
    title: "Flies Without Wings",
    emoji: "🪁",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "Week 49 drop.",
    question: "What flies without wings, dances on the wind, and is held down only by a string?",
    answers: ["kite", "a kite"],
    unlock: weeklyUnlock(49),
  },
  {
    id: "riddle-w51",
    kind: "riddle",
    title: "Broken Without Being Held",
    emoji: "🏆",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "Week 51 drop.",
    question: "What can be broken, and set, but is never physically held in your hands, measured in sports?",
    answers: ["record", "a record"],
    unlock: weeklyUnlock(51),
  },

  // --- Bonus riddles: unlocked by effort, not the calendar ---
  {
    id: "riddle-b1",
    kind: "riddle",
    title: "A Wet Coat",
    emoji: "🎨",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "What kind of coat is always wet when you put it on?",
    answers: ["paint", "a coat of paint"],
    unlock: { type: "tasksCompleted", count: 8 },
  },
  {
    id: "riddle-b2",
    kind: "riddle",
    title: "Many Teeth, No Eating",
    emoji: "🪚",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A bonus challenge.",
    question: "What has many teeth but cannot eat?",
    answers: ["saw", "a saw"],
    unlock: { type: "goalsCompleted", count: 1 },
  },
  {
    id: "riddle-b3",
    kind: "riddle",
    title: "A Table With No Legs",
    emoji: "🗓️",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "What kind of table has no legs at all?",
    answers: ["timetable", "a timetable"],
    unlock: { type: "habitCheckIns", count: 5 },
  },
  {
    id: "riddle-b4",
    kind: "riddle",
    title: "Up and Down, Never Moving",
    emoji: "🪜",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A bonus challenge.",
    question: "What goes up and down but never moves from its spot?",
    answers: ["stairs", "a staircase"],
    unlock: { type: "focusHours", count: 5 },
  },
  {
    id: "riddle-b5",
    kind: "riddle",
    title: "An Ear That Can't Hear",
    emoji: "🌽",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "What has an ear but cannot hear?",
    answers: ["corn", "a cornfield", "cornfield"],
    unlock: { type: "trophies", tier: "bronze", count: 3 },
  },
  {
    id: "riddle-b6",
    kind: "riddle",
    title: "Held Without Touching",
    emoji: "💨",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "A bonus challenge.",
    question: "What can you hold without ever touching it?",
    answers: ["breath", "your breath"],
    unlock: { type: "gamesCompleted", ids: ["color-match"] },
  },
  {
    id: "riddle-b7",
    kind: "riddle",
    title: "Black When Clean",
    emoji: "🖤",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "A bonus challenge.",
    question: "What is black when it's clean, and white when it's dirty?",
    answers: ["blackboard", "a blackboard", "chalkboard", "a chalkboard"],
    unlock: { type: "achievement", id: "study-session-1" },
  },
  {
    id: "riddle-b8",
    kind: "riddle",
    title: "Four Wheels and Flies",
    emoji: "🪰",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "What has four wheels and flies?",
    answers: ["garbage truck", "a garbage truck"],
    unlock: { type: "tasksCompleted", count: 40 },
  },
  {
    id: "riddle-b9",
    kind: "riddle",
    title: "A Band With No Music",
    emoji: "🎗️",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A bonus challenge.",
    question: "What kind of band never plays any music?",
    answers: ["rubber band", "a rubber band"],
    unlock: { type: "goalsCompleted", count: 6 },
  },
  {
    id: "riddle-b10",
    kind: "riddle",
    title: "Neck and Arms, No Body Parts",
    emoji: "👕",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "What has a neck but no head, and arms but no hands?",
    answers: ["shirt", "a shirt"],
    unlock: { type: "habitCheckIns", count: 70 },
  },
  {
    id: "riddle-b11",
    kind: "riddle",
    title: "Orange, Not a Parrot",
    emoji: "🥕",
    difficulty: "easy",
    rewardMinutes: 6,
    description: "A bonus challenge.",
    question: "What is orange and sounds like a parrot, but isn't a parrot?",
    answers: ["carrot", "a carrot"],
    unlock: { type: "focusHours", count: 35 },
  },
  {
    id: "riddle-b12",
    kind: "riddle",
    title: "A Cup That Holds No Water",
    emoji: "🧁",
    difficulty: "medium",
    rewardMinutes: 10,
    description: "A bonus challenge.",
    question: "What kind of cup doesn't hold water?",
    answers: ["cupcake", "a cupcake"],
    unlock: { type: "trophies", tier: "any", count: 12 },
  },
  {
    id: "riddle-b13",
    kind: "riddle",
    title: "Serve, Never Eat",
    emoji: "🎾",
    difficulty: "hard",
    rewardMinutes: 18,
    description: "A bonus challenge.",
    question: "What can you serve but never eat?",
    answers: ["tennis ball", "a tennis ball", "volleyball", "a volleyball"],
    unlock: { type: "gamesCompleted", ids: ["minesweeper", "slide-puzzle"] },
  },
  {
    id: "riddle-b14",
    kind: "riddle",
    title: "Two Mates, No Captain",
    emoji: "💍",
    difficulty: "hard",
    rewardMinutes: 20,
    description: "A bonus challenge.",
    question: "What kind of ship has two mates but no captain?",
    answers: ["relationship", "a relationship"],
    unlock: { type: "achievement", id: "habit-streak-3" },
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
    RIDDLES.find((g) => g.id === id) ||
    IQ_GAMES.find((g) => g.id === id) ||
    QMASTER_GAMES.find((g) => g.id === id)
  );
}

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: "var(--comic-green)",
  medium: "var(--comic-orange)",
  hard: "var(--comic-red)",
};
