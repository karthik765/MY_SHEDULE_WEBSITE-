// Beta/test mode: enter the code "sendhook" anywhere in Minigames to replay
// anything already unlocked, across all five tracks, as many times as you
// want — bypasses the weekly/daily caps only, never the unlock schedule
// (locked content stays locked). Never earns a reward and never touches
// the database (see the testMode branch in /api/games/attempt and
// /api/games/complete). Purely a client-side localStorage flag; there's no
// real adversary to defend against in a single-user app, so no
// server-side secret validation.

const TEST_MODE_KEY = "minigames-test-mode";
export const TEST_MODE_CODE = "sendhook";

export function isTestModeActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TEST_MODE_KEY) === "1";
}

// Returns true if the code matched and test mode is now on.
export function tryActivateTestMode(code: string): boolean {
  if (code.trim().toLowerCase() !== TEST_MODE_CODE) return false;
  localStorage.setItem(TEST_MODE_KEY, "1");
  return true;
}

export function deactivateTestMode(): void {
  localStorage.removeItem(TEST_MODE_KEY);
}
