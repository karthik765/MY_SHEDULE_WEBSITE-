import { findGameDef, type Difficulty } from "./games";

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

function isDifficulty(v: string): v is Difficulty {
  return v in DIFFICULTY_LABEL;
}

// Turns a FocusPointAdjustment.reason string into something readable for the
// Focus Points history feed. Reasons are colon-separated: "<kind>:<id>" for
// a reward, "<kind>-fail:<id>[:difficulty]" for a loss penalty, plus a few
// non-game reasons from src/lib/penalties.ts.
export function describeFocusReason(reason: string): string {
  const [head, id, extra] = reason.split(":");

  if (head === "task-failed") return "Missed a task deadline";
  if (head === "goal-failed") return "Missed a goal deadline";
  if (head === "habit-missed") return "Missed a habit check-in";

  const failMatch = head.match(/^(minigame|puzzle|riddle|iq|qmaster)-fail$/);
  if (failMatch) {
    const title = findGameDef(id)?.title ?? id;
    return extra && isDifficulty(extra) ? `Lost "${title}" (${DIFFICULTY_LABEL[extra]})` : `Lost "${title}"`;
  }

  if (head === "minigame") {
    const title = findGameDef(id)?.title ?? id;
    return extra && isDifficulty(extra) ? `Won "${title}" (${DIFFICULTY_LABEL[extra]})` : `Won "${title}"`;
  }

  if (head === "puzzle" || head === "riddle" || head === "iq" || head === "qmaster") {
    const title = findGameDef(id)?.title ?? id;
    return `Solved "${title}"`;
  }

  return reason;
}

// A quick-scan emoji per reason, so the history list doesn't rely on reading
// every label to tell entry types apart.
export function iconForReason(reason: string): string {
  const [head] = reason.split(":");

  if (head === "task-failed" || head === "goal-failed" || head === "habit-missed") return "📌";
  if (head.endsWith("-fail")) return "😬";
  if (head === "minigame") return "🎮";
  if (head === "puzzle") return "🧩";
  if (head === "riddle") return "🔍";
  if (head === "iq") return "🧠";
  if (head === "qmaster") return "✏️";
  return "✨";
}
