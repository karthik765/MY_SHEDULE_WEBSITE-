import type { CSSProperties } from "react";

const paths: Record<string, string> = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  focus: "M12 8v4l3 2 M9 2h6 M12 2v3 M19 5l2 2 M20 13a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  schedule: "M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4 M8 14h2 M14 14h2 M8 17h2",
  habits: "M20 11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9 M8 11l4 4L21 4",
  goals: "M21 12a9 9 0 1 1-9-9 M17 12a5 5 0 1 1-5-5 M12 12l9-9 M16 3h5v5",
  topics: "M4 3h7v7H4z M15 15h6v6h-6z M3 15h6v6H3z M7 10v3h11v2 M6 13v2",
  minigames: "M7 7h10a4 4 0 0 1 4 4l1 6a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2l1-6a4 4 0 0 1 4-4 M7 10v5 M4.5 12.5h5 M16 11h.1 M19 14h.1",
  social: "M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0 M7 11h10 M7 7h6",
  trophies: "M8 3h8v7a4 4 0 0 1-8 0z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 14v6 M8 21h8",
  points: "M13 2 4 14h7l-1 8 10-13h-7z",
  analytics: "M3 3v18h18 M7 16v-4 M12 16V8 M17 16V4",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  check: "M5 12l4 4L19 6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  close: "M6 6l12 12 M6 18 18 6",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1",
  moon: "M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10",
  logout: "M9 3H4v18h5 M9 12h12 M17 8l4 4-4 4",
  play: "m8 4 12 8-12 8z",
};

export default function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name] ?? paths.dashboard} /></svg>;
}
