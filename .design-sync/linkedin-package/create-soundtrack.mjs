import { writeFile } from "node:fs/promises";

const sampleRate = 48000;
const duration = 49;
const channels = 2;
const frames = sampleRate * duration;
const bytes = Buffer.alloc(44 + frames * channels * 2);
bytes.write("RIFF", 0);
bytes.writeUInt32LE(bytes.length - 8, 4);
bytes.write("WAVEfmt ", 8);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(channels, 22);
bytes.writeUInt32LE(sampleRate, 24);
bytes.writeUInt32LE(sampleRate * channels * 2, 28);
bytes.writeUInt16LE(channels * 2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36);
bytes.writeUInt32LE(frames * channels * 2, 40);

function smoothstep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

const bpm = 112;
const beatLength = 60 / bpm;
const progression = [
  [73.42, 87.31, 110.0],
  [58.27, 73.42, 87.31],
  [65.41, 82.41, 98.0],
  [55.0, 65.41, 82.41],
];
let noiseState = 0x1a2b3c4d;
const noise = () => {
  noiseState = (1664525 * noiseState + 1013904223) >>> 0;
  return noiseState / 0x80000000 - 1;
};

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const fade = smoothstep(t / 2) * smoothstep((duration - t) / 2.8);
  const beatIndex = Math.floor(t / beatLength);
  const beatPhase = t % beatLength;
  const halfBeatPhase = t % (beatLength / 2);
  const bar = Math.floor(beatIndex / 4);
  const chord = progression[Math.floor(bar / 2) % progression.length];
  const build = 0.68 + 0.32 * smoothstep((t - 12) / 18);

  const kickPitch = 46 + 72 * Math.exp(-beatPhase * 34);
  const kick = Math.sin(2 * Math.PI * kickPitch * beatPhase) * Math.exp(-beatPhase * 13);
  const snarePhase = (t - beatLength) % (beatLength * 2);
  const snare = snarePhase >= 0 && snarePhase < 0.22
    ? noise() * Math.exp(-snarePhase * 18) + 0.28 * Math.sin(2 * Math.PI * 185 * snarePhase) * Math.exp(-snarePhase * 14)
    : 0;
  const hat = noise() * Math.exp(-halfBeatPhase * 58) * (beatIndex % 2 ? 0.9 : 0.55);

  const chordTime = t + 0.018 * Math.sin(t * 0.31);
  const pad = chord.reduce((sum, frequency, index) => sum
    + Math.sin(2 * Math.PI * frequency * chordTime + index * 0.7)
    + 0.24 * Math.sin(2 * Math.PI * frequency * 2 * chordTime), 0) / chord.length;
  const bassFrequency = chord[0] / 2;
  const bassEnvelope = 0.58 + 0.42 * Math.exp(-beatPhase * 4.5);
  const bass = Math.sin(2 * Math.PI * bassFrequency * t) * bassEnvelope;

  const arpStep = Math.floor(t / (beatLength / 2));
  const arpPhase = t % (beatLength / 2);
  const arpFrequency = chord[arpStep % chord.length] * 4;
  const arp = Math.sin(2 * Math.PI * arpFrequency * t) * Math.exp(-arpPhase * 7);
  const shimmer = Math.sin(2 * Math.PI * (chord[2] * 4) * t + Math.sin(t * 0.6)) * (0.45 + 0.55 * Math.sin(Math.PI * t / 8) ** 2);

  const low = 0.105 * pad + 0.13 * bass + 0.17 * kick;
  const rhythm = build * (0.075 * snare + 0.026 * hat);
  const melody = build * (0.034 * arp + 0.012 * shimmer);
  const leftValue = fade * (low + rhythm + melody);
  const rightValue = fade * (0.97 * low + 0.93 * rhythm + build * (0.032 * arp - 0.012 * shimmer));
  const left = Math.round(Math.tanh(leftValue * 1.25) * 32767);
  const right = Math.round(Math.tanh(rightValue * 1.25) * 32767);
  const offset = 44 + i * 4;
  bytes.writeInt16LE(left, offset);
  bytes.writeInt16LE(right, offset + 2);
}

await writeFile(new URL("./soundtrack-original.wav", import.meta.url), bytes);
