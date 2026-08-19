// PlayStation-style trophy case, computed live from current stats — nothing
// is stored separately, so "unlocked" always reflects the current data.

import { PUZZLES, RIDDLES } from "./games";

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
}

export type AchievementCategory = "timer" | "habits" | "tasks" | "goals" | "media" | "minigames";

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
