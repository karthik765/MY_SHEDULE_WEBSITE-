// Xbox-style achievements computed live from current stats — nothing is
// stored separately, so "unlocked" always reflects the current data.

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
}

export type AchievementCategory = "timer" | "habits" | "tasks" | "goals" | "media";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  points: number;
  category: AchievementCategory;
  check: (stats: AchievementStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Timer / study streak
  {
    id: "study-session-1",
    title: "Session Starter",
    description: "Log your first study session.",
    points: 5,
    category: "timer",
    check: (s) => s.totalStudySessions >= 1,
  },
  {
    id: "study-streak-1",
    title: "First Rep",
    description: "Study 10 hours in a single day.",
    points: 10,
    category: "timer",
    check: (s) => s.studyStreak >= 1,
  },
  {
    id: "study-streak-3",
    title: "On a Roll",
    description: "Hit the 10-hour study day 3 days in a row.",
    points: 25,
    category: "timer",
    check: (s) => s.studyStreak >= 3,
  },
  {
    id: "study-streak-7",
    title: "Full Week",
    description: "Hit the 10-hour study day 7 days in a row.",
    points: 50,
    category: "timer",
    check: (s) => s.studyStreak >= 7,
  },
  {
    id: "study-streak-10",
    title: "Perfect 10",
    description: "Hit the 10-hour study day 10 days in a row.",
    points: 100,
    category: "timer",
    check: (s) => s.studyStreak >= 10,
  },
  {
    id: "study-streak-25",
    title: "Halfway There",
    description: "Hit the 10-hour study day 25 days in a row.",
    points: 200,
    category: "timer",
    check: (s) => s.studyStreak >= 25,
  },
  {
    id: "study-streak-50",
    title: "50-Day Legend",
    description: "Reach the full 50-day study streak goal.",
    points: 500,
    category: "timer",
    check: (s) => s.studyStreak >= 50,
  },
  {
    id: "study-hours-100",
    title: "Marathoner",
    description: "Log 100 total hours of study time.",
    points: 150,
    category: "timer",
    check: (s) => s.totalStudyHours >= 100,
  },

  // Habits
  {
    id: "habit-streak-3",
    title: "Streak Rookie",
    description: "Keep any habit going 3 days in a row.",
    points: 20,
    category: "habits",
    check: (s) => s.longestHabitStreak >= 3,
  },
  {
    id: "habit-streak-7",
    title: "Habit Former",
    description: "Keep any habit going 7 days in a row.",
    points: 40,
    category: "habits",
    check: (s) => s.longestHabitStreak >= 7,
  },
  {
    id: "habit-streak-30",
    title: "Streak Master",
    description: "Keep any habit going 30 days in a row.",
    points: 200,
    category: "habits",
    check: (s) => s.longestHabitStreak >= 30,
  },
  {
    id: "habit-checkins-50",
    title: "Consistent",
    description: "Log 50 total habit check-ins.",
    points: 75,
    category: "habits",
    check: (s) => s.totalHabitCheckIns >= 50,
  },

  // Tasks
  {
    id: "tasks-1",
    title: "Getting Things Done",
    description: "Complete your first task.",
    points: 5,
    category: "tasks",
    check: (s) => s.tasksCompleted >= 1,
  },
  {
    id: "tasks-25",
    title: "Task Crusher",
    description: "Complete 25 tasks.",
    points: 50,
    category: "tasks",
    check: (s) => s.tasksCompleted >= 25,
  },
  {
    id: "tasks-100",
    title: "Task Machine",
    description: "Complete 100 tasks.",
    points: 150,
    category: "tasks",
    check: (s) => s.tasksCompleted >= 100,
  },

  // Goals
  {
    id: "milestones-1",
    title: "Milestone Setter",
    description: "Complete your first milestone.",
    points: 10,
    category: "goals",
    check: (s) => s.milestonesCompleted >= 1,
  },
  {
    id: "goals-1",
    title: "Goal Getter",
    description: "Complete your first goal.",
    points: 50,
    category: "goals",
    check: (s) => s.goalsCompleted >= 1,
  },
  {
    id: "goals-5",
    title: "Overachiever",
    description: "Complete 5 goals.",
    points: 150,
    category: "goals",
    check: (s) => s.goalsCompleted >= 5,
  },

  // Media
  {
    id: "movies-5",
    title: "Movie Buff",
    description: "Watch 5 movies.",
    points: 30,
    category: "media",
    check: (s) => s.moviesWatched >= 5,
  },
  {
    id: "webseries-5",
    title: "Binge Watcher",
    description: "Finish 5 web series.",
    points: 30,
    category: "media",
    check: (s) => s.webSeriesWatched >= 5,
  },
  {
    id: "games-5",
    title: "Game On",
    description: "Beat/finish 5 games.",
    points: 30,
    category: "media",
    check: (s) => s.gamesPlayed >= 5,
  },
];

export function computeUnlocked(stats: AchievementStats) {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.check(stats) }));
}

export function totalPoints(stats: AchievementStats): number {
  return ACHIEVEMENTS.filter((a) => a.check(stats)).reduce((sum, a) => sum + a.points, 0);
}

export function pointsForUnlocked(unlockedIds: Set<string>): number {
  return ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).reduce((sum, a) => sum + a.points, 0);
}

export function maxPoints(): number {
  return ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);
}
