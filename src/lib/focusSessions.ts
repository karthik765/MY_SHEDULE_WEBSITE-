// A Non-Focused session is tagged in its subject rather than in a column, so
// both the timer UI and the stop endpoint can recognise one without a schema
// change — the same trick Classic Mode uses to encode its session number.
export const SLOW_TAG = " (Non-Focused ×0.5)";
export const SLOW_RATE = 0.5;

export function isSlowSubject(subject: string): boolean {
  return subject.endsWith(SLOW_TAG);
}

// Non-Focused time is discounted as *study time* only: half of it lands in
// StudySession.durationMinutes, which is what the hours/streak stats read.
// Focus Points aren't discounted — the effort was real — so the withheld
// half is handed back through the adjustment ledger, which never touches the
// study history. 30 real minutes => 15 minutes studied, 30 points.
export function nonFocusedMakeUpReason(sessionId: string): string {
  return `non-focused-credit:${sessionId}`;
}
