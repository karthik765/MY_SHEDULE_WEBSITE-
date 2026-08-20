// PlayStation-style trophy case, computed live from current stats — nothing
// is stored separately, so "unlocked" always reflects the current data.

import { MINIGAMES, PUZZLES, RIDDLES, IQ_GAMES } from "./games";

export interface AchievementStats {
  studyStreak: number;
  totalStudyHours: number;
  totalStudySessions: number;
  longestHabitStreak: number;
  totalHabitCheckIns: number;
  tasksCompleted: number;
  goalsCompleted: number;
  milestonesCompleted: number;
  moviesWatched: number;
  webSeriesWatched: number;
  gamesPlayed: number;
  minigamesWon: number;
  puzzlesSolved: number;
  riddlesSolved: number;
  distinctMinigamesWon: number; // how many DIFFERENT minigames have at least one win, not total wins
  hardDifficultyWins: number; // rewarded minigame wins completed on Hard
  minigameWinsById: Record<string, number>; // per-game win counts, for "beat this specific new game" trophies
  iqLevelsSolved: number; // how many of the 52 IQ Levels have been solved
}

export type AchievementCategory = "timer" | "habits" | "tasks" | "goals" | "media" | "minigames" | "iq";

export type AchievementTier = "bronze" | "silver" | "gold";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  category: AchievementCategory;
  check: (stats: AchievementStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Timer / study streak
  {
    id: "study-session-1",
    title: "Session Starter",
    description: "Log your first study session.",
    tier: "bronze",
    category: "timer",
    check: (s) => s.totalStudySessions >= 1,
  },
  {
    id: "study-streak-1",
    title: "First Rep",
    description: "Study 10 hours in a single day.",
    tier: "bronze",
    category: "timer",
    check: (s) => s.studyStreak >= 1,
  },
  {
    id: "study-streak-3",
    title: "On a Roll",
    description: "Hit the 10-hour study day 3 days in a row.",
    tier: "silver",
    category: "timer",
    check: (s) => s.studyStreak >= 3,
  },
  {
    id: "study-streak-7",
    title: "Full Week",
    description: "Hit the 10-hour study day 7 days in a row.",
    tier: "silver",
    category: "timer",
    check: (s) => s.studyStreak >= 7,
  },
  {
    id: "study-streak-10",
    title: "Perfect 10",
    description: "Hit the 10-hour study day 10 days in a row.",
    tier: "gold",
    category: "timer",
    check: (s) => s.studyStreak >= 10,
  },
  {
    id: "study-streak-25",
    title: "Halfway There",
    description: "Hit the 10-hour study day 25 days in a row.",
    tier: "gold",
    category: "timer",
    check: (s) => s.studyStreak >= 25,
  },
  {
    id: "study-streak-50",
    title: "50-Day Legend",
    description: "Reach the full 50-day study streak goal.",
    tier: "gold",
    category: "timer",
    check: (s) => s.studyStreak >= 50,
  },
  {
    id: "study-hours-100",
    title: "Marathoner",
    description: "Log 100 total hours of study time.",
    tier: "gold",
    category: "timer",
    check: (s) => s.totalStudyHours >= 100,
  },

  // Habits
  {
    id: "habit-streak-3",
    title: "Streak Rookie",
    description: "Keep any habit going 3 days in a row.",
    tier: "bronze",
    category: "habits",
    check: (s) => s.longestHabitStreak >= 3,
  },
  {
    id: "habit-streak-7",
    title: "Habit Former",
    description: "Keep any habit going 7 days in a row.",
    tier: "silver",
    category: "habits",
    check: (s) => s.longestHabitStreak >= 7,
  },
  {
    id: "habit-streak-30",
    title: "Streak Master",
    description: "Keep any habit going 30 days in a row.",
    tier: "gold",
    category: "habits",
    check: (s) => s.longestHabitStreak >= 30,
  },
  {
    id: "habit-checkins-50",
    title: "Consistent",
    description: "Log 50 total habit check-ins.",
    tier: "silver",
    category: "habits",
    check: (s) => s.totalHabitCheckIns >= 50,
  },

  // Tasks
  {
    id: "tasks-1",
    title: "Getting Things Done",
    description: "Complete your first task.",
    tier: "bronze",
    category: "tasks",
    check: (s) => s.tasksCompleted >= 1,
  },
  {
    id: "tasks-25",
    title: "Task Crusher",
    description: "Complete 25 tasks.",
    tier: "silver",
    category: "tasks",
    check: (s) => s.tasksCompleted >= 25,
  },
  {
    id: "tasks-100",
    title: "Task Machine",
    description: "Complete 100 tasks.",
    tier: "gold",
    category: "tasks",
    check: (s) => s.tasksCompleted >= 100,
  },

  // Goals
  {
    id: "milestones-1",
    title: "Milestone Setter",
    description: "Complete your first milestone.",
    tier: "bronze",
    category: "goals",
    check: (s) => s.milestonesCompleted >= 1,
  },
  {
    id: "goals-1",
    title: "Goal Getter",
    description: "Complete your first goal.",
    tier: "silver",
    category: "goals",
    check: (s) => s.goalsCompleted >= 1,
  },
  {
    id: "goals-5",
    title: "Overachiever",
    description: "Complete 5 goals.",
    tier: "gold",
    category: "goals",
    check: (s) => s.goalsCompleted >= 5,
  },

  // Media
  {
    id: "movies-5",
    title: "Movie Buff",
    description: "Watch 5 movies.",
    tier: "silver",
    category: "media",
    check: (s) => s.moviesWatched >= 5,
  },
  {
    id: "webseries-5",
    title: "Binge Watcher",
    description: "Finish 5 web series.",
    tier: "silver",
    category: "media",
    check: (s) => s.webSeriesWatched >= 5,
  },
  {
    id: "games-5",
    title: "Game On",
    description: "Beat/finish 5 games.",
    tier: "silver",
    category: "media",
    check: (s) => s.gamesPlayed >= 5,
  },

  // Minigames, puzzles & mystery riddles
  {
    id: "minigame-win-1",
    title: "Player One",
    description: "Win your first minigame.",
    tier: "bronze",
    category: "minigames",
    check: (s) => s.minigamesWon >= 1,
  },
  {
    id: "minigame-win-10",
    title: "High Scorer",
    description: "Win minigames 10 times total.",
    tier: "silver",
    category: "minigames",
    check: (s) => s.minigamesWon >= 10,
  },
  {
    id: "minigame-win-25",
    title: "Arcade Legend",
    description: "Win minigames 25 times total.",
    tier: "gold",
    category: "minigames",
    check: (s) => s.minigamesWon >= 25,
  },
  {
    id: "puzzle-solve-1",
    title: "Puzzle Novice",
    description: "Solve your first brain puzzle.",
    tier: "bronze",
    category: "minigames",
    check: (s) => s.puzzlesSolved >= 1,
  },
  {
    id: "puzzle-solve-all",
    title: "Puzzle Master",
    description: "Solve every brain puzzle.",
    tier: "silver",
    category: "minigames",
    check: (s) => s.puzzlesSolved >= PUZZLES.length,
  },
  {
    id: "riddle-solve-1",
    title: "Riddle Rookie",
    description: "Solve your first mystery riddle.",
    tier: "bronze",
    category: "minigames",
    check: (s) => s.riddlesSolved >= 1,
  },
  {
    id: "riddle-solve-all",
    title: "Master Detective",
    description: "Solve every mystery riddle.",
    tier: "silver",
    category: "minigames",
    check: (s) => s.riddlesSolved >= RIDDLES.length,
  },
  {
    id: "brain-champion",
    title: "Brain Champion",
    description: "Solve every puzzle and every mystery riddle.",
    tier: "gold",
    category: "minigames",
    check: (s) => s.puzzlesSolved >= PUZZLES.length && s.riddlesSolved >= RIDDLES.length,
  },

  // More minigames/puzzles/riddles unlocked over time — these track progress
  // through that larger library.
  {
    id: "puzzle-solve-5",
    title: "Puzzle Enthusiast",
    description: "Solve 5 brain puzzles.",
    tier: "bronze",
    category: "minigames",
    check: (s) => s.puzzlesSolved >= 5,
  },
  {
    id: "puzzle-solve-20",
    title: "Puzzle Pro",
    description: "Solve 20 brain puzzles.",
    tier: "silver",
    category: "minigames",
    check: (s) => s.puzzlesSolved >= 20,
  },
  {
    id: "puzzle-solve-40",
    title: "Puzzle Grandmaster",
    description: "Solve 40 brain puzzles.",
    tier: "gold",
    category: "minigames",
    check: (s) => s.puzzlesSolved >= 40,
  },
  {
    id: "riddle-solve-5",
    title: "Riddle Enthusiast",
    description: "Solve 5 mystery riddles.",
    tier: "bronze",
    category: "minigames",
    check: (s) => s.riddlesSolved >= 5,
  },
  {
    id: "riddle-solve-20",
    title: "Riddle Pro",
    description: "Solve 20 mystery riddles.",
    tier: "silver",
    category: "minigames",
    check: (s) => s.riddlesSolved >= 20,
  },
  {
    id: "riddle-solve-40",
    title: "Riddle Grandmaster",
    description: "Solve 40 mystery riddles.",
    tier: "gold",
    category: "minigames",
    check: (s) => s.riddlesSolved >= 40,
  },
  {
    id: "minigame-win-50",
    title: "Arcade Regular",
    description: "Win minigames 50 times total.",
    tier: "bronze",
    category: "minigames",
    check: (s) => s.minigamesWon >= 50,
  },
  {
    id: "minigame-win-100",
    title: "Arcade Veteran",
    description: "Win minigames 100 times total.",
    tier: "silver",
    category: "minigames",
    check: (s) => s.minigamesWon >= 100,
  },
  {
    id: "minigame-win-200",
    title: "Arcade Icon",
    description: "Win minigames 200 times total.",
    tier: "gold",
    category: "minigames",
    check: (s) => s.minigamesWon >= 200,
  },
  {
    id: "minigame-variety-8",
    title: "Jack of All Games",
    description: "Win at least 8 different minigames (any difficulty).",
    tier: "silver",
    category: "minigames",
    check: (s) => s.distinctMinigamesWon >= 8,
  },
  {
    id: "minigame-variety-all",
    title: "Master of All Games",
    description: "Win every minigame at least once.",
    tier: "gold",
    category: "minigames",
    check: (s) => s.distinctMinigamesWon >= MINIGAMES.length,
  },
  {
    id: "hard-mode-1",
    title: "Hard Mode",
    description: "Win a minigame on Hard difficulty.",
    tier: "bronze",
    category: "minigames",
    check: (s) => s.hardDifficultyWins >= 1,
  },
  {
    id: "hard-mode-10",
    title: "Glutton for Punishment",
    description: "Win 10 minigames on Hard difficulty.",
    tier: "silver",
    category: "minigames",
    check: (s) => s.hardDifficultyWins >= 10,
  },
  {
    id: "hard-mode-30",
    title: "Difficulty Deity",
    description: "Win 30 minigames on Hard difficulty.",
    tier: "gold",
    category: "minigames",
    check: (s) => s.hardDifficultyWins >= 30,
  },
  {
    id: "win-rps",
    title: "Rock Solid",
    description: "Win a round of Rock-Paper-Scissors Blitz.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["rps"] ?? 0) >= 1,
  },
  {
    id: "win-simon-says",
    title: "Simon Says Win",
    description: "Beat Simon Says.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["simon-says"] ?? 0) >= 1,
  },
  {
    id: "win-whack-a-mole",
    title: "Mole Whacker",
    description: "Beat Whack-a-Mole.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["whack-a-mole"] ?? 0) >= 1,
  },
  {
    id: "win-word-scramble",
    title: "Word Wizard",
    description: "Beat Word Scramble.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["word-scramble"] ?? 0) >= 1,
  },
  {
    id: "win-connect-four",
    title: "Connect the Dots",
    description: "Beat Connect Four.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["connect-four"] ?? 0) >= 1,
  },
  {
    id: "win-speed-math",
    title: "Mental Math",
    description: "Beat Speed Math.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["speed-math"] ?? 0) >= 1,
  },
  {
    id: "win-higher-lower",
    title: "Lucky Guesser",
    description: "Beat Higher or Lower.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["higher-lower"] ?? 0) >= 1,
  },
  {
    id: "win-color-match",
    title: "Quick Eye",
    description: "Beat Color Match.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["color-match"] ?? 0) >= 1,
  },
  {
    id: "win-slide-puzzle",
    title: "Tile Slider",
    description: "Beat Slide Puzzle.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["slide-puzzle"] ?? 0) >= 1,
  },
  {
    id: "win-minesweeper",
    title: "Bomb Defused",
    description: "Beat Minesweeper Mini.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["minesweeper"] ?? 0) >= 1,
  },
  {
    id: "win-typing-challenge",
    title: "Fast Fingers",
    description: "Beat Typing Challenge.",
    tier: "bronze",
    category: "minigames",
    check: (s) => (s.minigameWinsById["typing-challenge"] ?? 0) >= 1,
  },

  // The weekly minigame library has grown well past the original 16 — these
  // fill the gap between "8 different" and "every single one" as more keep
  // unlocking every Monday.
  {
    id: "minigame-variety-20",
    title: "Well Rounded",
    description: "Win at least 20 different minigames (any difficulty).",
    tier: "bronze",
    category: "minigames",
    check: (s) => s.distinctMinigamesWon >= 20,
  },
  {
    id: "minigame-variety-35",
    title: "Arcade Collector",
    description: "Win at least 35 different minigames (any difficulty).",
    tier: "silver",
    category: "minigames",
    check: (s) => s.distinctMinigamesWon >= 35,
  },

  // IQ Levels — the 52-level progressive logic track. Each level pays out
  // once, the first time it's solved, so these track distinct levels solved.
  {
    id: "iq-level-1",
    title: "IQ Awakening",
    description: "Solve your first IQ Level.",
    tier: "bronze",
    category: "iq",
    check: (s) => s.iqLevelsSolved >= 1,
  },
  {
    id: "iq-level-13",
    title: "Warming Up",
    description: "Solve 13 IQ Levels.",
    tier: "bronze",
    category: "iq",
    check: (s) => s.iqLevelsSolved >= 13,
  },
  {
    id: "iq-level-26",
    title: "Halfway to Genius",
    description: "Solve 26 IQ Levels — the halfway point.",
    tier: "silver",
    category: "iq",
    check: (s) => s.iqLevelsSolved >= 26,
  },
  {
    id: "iq-level-all",
    title: "IQ Genius",
    description: "Solve every IQ Level, all the way to Level 52.",
    tier: "gold",
    category: "iq",
    check: (s) => s.iqLevelsSolved >= IQ_GAMES.length,
  },
];

export function computeUnlocked(stats: AchievementStats) {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.check(stats) }));
}

export interface TrophyCounts {
  bronze: number;
  silver: number;
  gold: number;
  platinum: boolean;
}

// Platinum, PlayStation-style, means every other trophy has been earned.
export function trophyCounts(unlockedIds: Set<string>): TrophyCounts {
  const unlocked = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id));
  return {
    bronze: unlocked.filter((a) => a.tier === "bronze").length,
    silver: unlocked.filter((a) => a.tier === "silver").length,
    gold: unlocked.filter((a) => a.tier === "gold").length,
    platinum: unlockedIds.size >= ACHIEVEMENTS.length,
  };
}

export function totalTierCounts(): Record<AchievementTier, number> {
  return {
    bronze: ACHIEVEMENTS.filter((a) => a.tier === "bronze").length,
    silver: ACHIEVEMENTS.filter((a) => a.tier === "silver").length,
    gold: ACHIEVEMENTS.filter((a) => a.tier === "gold").length,
  };
}
