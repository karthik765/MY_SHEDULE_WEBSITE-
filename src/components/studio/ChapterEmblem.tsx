"use client";

import { useId } from "react";

export default function ChapterEmblem({ section }: { section: string }) {
  const id = useId();
  return <svg className="chapter-emblem" viewBox="0 0 300 260" fill="none" aria-hidden="true">
    <defs><linearGradient id={id} x1="65" y1="20" x2="225" y2="240" gradientUnits="userSpaceOnUse"><stop stopColor="#fff0c7" /><stop offset=".3" stopColor="#f7b155" /><stop offset=".6" stopColor="#704321" /><stop offset="1" stopColor="#eab66a" /></linearGradient></defs>
    <g fill={`url(#${id})`} stroke="#edb36e" strokeWidth="1.4" strokeLinejoin="round">
      {section === "trophies" ? <><path d="M93 48H207L194 130L150 164L106 130Z" /><path d="M93 62H59V88Q59 134 110 139L106 119Q77 114 77 83V79H96M207 62H241V88Q241 134 190 139L194 119Q223 114 223 83V79H204" /><path d="M141 157H159V203H187L196 221H104L113 203H141Z" /><path d="M150 48V163L194 130L207 48Z" fill="#57371f" opacity=".65" /><path d="M150 71L157 88L176 90L162 103L166 122L150 113L134 122L138 103L124 90L143 88Z" fill="#ffe0a1" /><path d="M75 172L88 192M225 172L212 192M96 210L82 213M204 210L218 213" fill="none" strokeWidth="4" /></> : section === "focus-points" ? <><path d="M164 25L78 151H133L118 237L230 103H169L187 25Z" /><path d="M164 25L149 121H202L118 237L230 103H169L187 25Z" fill="#794923" /><path d="M74 63L63 52M226 184L239 197M59 111H38M234 59L245 47" strokeWidth="3" /><path d="M149 121L133 151H78" fill="none" stroke="#fff2cd" strokeWidth="3" /></> : section === "minigames" ? <><path d="M88 68H212L232 84L257 176Q261 201 238 204L201 175H99L62 204Q39 201 43 176L68 84Z" /><path d="M82 79H218L245 172Q248 184 237 188L202 160H98L63 188Q52 184 55 172Z" fill="#171c17" /><path d="M85 102H103V118H119V135H103V151H85V135H69V118H85Z" /><circle cx="200" cy="112" r="10" /><circle cx="220" cy="136" r="10" /><path d="M138 139H162" strokeWidth="6" /><path d="M139 68V45Q139 24 163 24" fill="none" strokeWidth="3" /></> : <><path d="M150 25L230 70V190L150 235L70 190V70Z" /><path d="M150 39L218 78V182L150 221L82 182V78Z" fill="#151b16" /><path d="M150 55V73M150 187V205M97 98L111 106M189 154L203 162M97 162L111 154M189 106L203 98" strokeWidth="3" /><path d="M150 89V133L181 150" strokeWidth="7" strokeLinecap="round" fill="none" /><circle cx="150" cy="133" r="7" /></>}
    </g>
    <path d="M80 245H220" stroke="#b37938" opacity=".45" />
  </svg>;
}
