// Synthesized chimes (no audio files needed). AudioContext must be
// created/resumed from a real user gesture for browser autoplay rules to
// allow later programmatic playback, hence the ref pattern.
export function getAudioContext(ref: { current: AudioContext | null }): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!ref.current) {
    ref.current = new AudioCtxClass();
  }
  if (ref.current.state === "suspended") {
    ref.current.resume();
  }
  return ref.current;
}

export function playChime(ctx: AudioContext, frequencies: number[], noteMs: number) {
  let t = ctx.currentTime;
  for (const freq of frequencies) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + noteMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + noteMs / 1000 + 0.05);
    t += noteMs / 1000 + 0.05;
  }
}

export type SoundCue =
  | "intro"
  | "tab"
  | "start"
  | "stop"
  | "complete"
  | "breakDone"
  | "achievement";

export function playSoundCue(ref: { current: AudioContext | null }, cue: SoundCue) {
  const ctx = getAudioContext(ref);
  if (!ctx) return;

  switch (cue) {
    case "intro":
      playChime(ctx, [261.63, 329.63, 392, 523.25], 150);
      break;
    case "tab":
      playChime(ctx, [659.25], 70);
      break;
    case "start":
      playChime(ctx, [523.25, 659.25], 100);
      break;
    case "stop":
      playChime(ctx, [659.25, 523.25], 100);
      break;
    case "complete":
      playChime(ctx, [783.99, 987.77, 1174.66], 150);
      break;
    case "breakDone":
      playChime(ctx, [659.25, 523.25, 659.25], 150);
      break;
    case "achievement":
      playChime(ctx, [523.25, 659.25, 783.99, 1046.5], 140);
      break;
  }
}
