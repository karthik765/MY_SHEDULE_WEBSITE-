export function isGoalLocked(goal: { locked: boolean; targetDate: Date | string | null }): boolean {
  if (!goal.locked || !goal.targetDate) return false;
  return new Date(goal.targetDate).getTime() > Date.now();
}
