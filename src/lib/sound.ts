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
