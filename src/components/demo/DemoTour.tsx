"use client";

import { useState } from "react";
import Link from "next/link";
import Atmosphere from "@/components/studio/Atmosphere";
import BrandMark from "@/components/studio/BrandMark";
import Sculpture from "@/components/studio/Sculpture";
import SectionScene from "@/components/studio/SectionScene";
import ThemeToggle from "@/components/ThemeToggle";
import GameArtwork from "@/components/studio/GameArtwork";
import { DEMO_SECTIONS, type DemoSection } from "@/lib/demo";

function Empty({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return <section className="dashboard-panel demo-empty"><p className="eyebrow">EMPTY WORKSPACE / DEMO</p><h2>{title}</h2><p>{children}</p>{action && <button type="button" disabled title="Unavailable in this read-only demo" className="comic-btn">{action} <span>/ Preview only</span></button>}</section>;
}

function Metrics({ labels }: { labels: string[] }) {
  return <div className="dashboard-stats">{labels.map(label => <div className="studio-stat" key={label}><p className="stat-label">{label}</p><p className="stat-value">0</p><p className="stat-note">NO ACTIVITY YET</p></div>)}</div>;
}

type DemoGame = { id: string; title: string; kind: string; description: string };

function Preview({ section, view, games }: { section: string; view: string; games: DemoGame[] }) {
  if (section === "overview") return <><Metrics labels={["FOCUS HOURS", "TASKS DUE", "CURRENT STREAK"]} /><div className="demo-grid"><Empty title="A little breathing room.">No scheduled events or tasks. Browse Schedule to see where your day takes shape.</Empty><Empty title="Build something that matters.">No goals or habits yet. Your real workspace stays private and separate.</Empty></div></>;
  if (section === "focus") return <><section className="demo-focus dashboard-panel"><div className="demo-timer-orbit" aria-hidden="true" /><p className="eyebrow">{view.toUpperCase()} MODE / NOT STARTED</p><h2>00:00:00</h2><p>No session in progress</p><button disabled className="primary-action">Start session / Preview only</button><small>{view === "Classic" ? "Structured sessions with short breaks." : view === "Free" ? "An open-ended space for deep work." : "A lighter rhythm for everyday tasks."}</small></section><Metrics labels={["TODAY", "THIS WEEK", "DAILY AVERAGE"]} /><Empty title="Your focus history is empty.">No sessions have been recorded.</Empty></>;
  if (section === "schedule") return <><Metrics labels={["EVENTS", "TASKS", "COMPLETED"]} />{view === "Calendar" && <div className="demo-calendar" aria-label="Empty weekly calendar">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(day => <div key={day}><span>{day}</span><i /><i /><i /></div>)}</div>}<Empty title={view === "Tasks" ? "Nothing on your list yet." : "Your day is a blank canvas."} action={view === "Tasks" ? "Add task" : "Add event"}>No {view === "Tasks" ? "tasks" : "events"} in this demo. Creating, editing, and completing items is disabled.</Empty></>;
  if (section === "habits") return <><Metrics labels={[view === "Habits" ? "HABITS" : "ENTRIES", "COMPLETED", "CURRENT STREAK"]} /><Empty title={view === "Habits" ? "Start something worth repeating." : view === "Journal" ? "Room for your next reflection." : `Your ${view.toLowerCase()} shelf is empty.`} action={view === "Habits" ? "Add habit" : view === "Journal" ? "Write entry" : "Add title"}>No {view.toLowerCase()} saved. This view does not load journals, personal notes, or media from any account.</Empty></>;
  if (section === "goals") return <><Metrics labels={["ACTIVE GOALS", "MILESTONES", "COMPLETED"]} /><Empty title="Big things start with a single step." action="Create goal">No goals or milestones. Goal creation, proof uploads, and completion are unavailable in demo.</Empty></>;
  if (section === "topics") return <><Metrics labels={["TOPICS", "IN PROGRESS", "MASTERED"]} /><Empty title="Your knowledge atlas starts here." action="Add topic">No topics or learning records. The animated atlas above is decorative, not saved progress.</Empty></>;
  if (section === "minigames") {
    const kind = ({ Minigames: "minigame", Puzzles: "puzzle", Riddles: "riddle", IQ: "iq", "Q Master": "qmaster" } as Record<string, string>)[view];
    return <><Metrics labels={["GAMES PLAYED", "COMPLETED", "POINTS EARNED"]} />{view === "Stats" ? <Empty title="No games played.">Your demo has no scores, attempts, or rewards.</Empty> : <div className="demo-grid">{games.filter(game => game.kind === kind).map(game => <section key={game.id} className="dashboard-panel demo-game"><div className="demo-game-art"><GameArtwork id={game.id} kind={game.kind} /></div><p className="eyebrow">{view.toUpperCase()} / VISUAL PREVIEW</p><h2>{game.title}</h2><p>{game.description}</p><button disabled className="comic-btn">Play / Unavailable in demo</button></section>)}</div>}</>;
  }
  if (section === "social") return <><Metrics labels={["SESSIONS", "MINUTES USED", "TIME EARNED"]} /><Empty title="Connection, on your terms." action="Open social session">No active social sessions. External apps and session tracking are disabled.</Empty></>;
  if (section === "trophies") return <><Metrics labels={["BRONZE", "SILVER", "GOLD"]} /><Empty title="Your first milestone is ahead.">No trophies unlocked. The trophy sculpture is a feature preview, not an earned award.</Empty></>;
  if (section === "focus-points") return <><Metrics labels={["POINT BALANCE", "EARNED", "SPENT"]} /><Empty title="A fresh start. Zero points.">No transactions, rewards, or penalties. There is nothing to redeem in this preview.</Empty></>;
  return <><Metrics labels={["STUDY HOURS", "TASKS COMPLETED", "HABIT COMPLETION"]} /><section className="dashboard-panel demo-chart"><h2>Your week, at a glance.</h2><div aria-label="Empty activity chart, all values zero">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={index}><i /><small>{day}</small></span>)}</div><p>No activity recorded. Charts will begin at zero.</p></section></>;
}

export default function DemoTour({ section, games }: { section: DemoSection; games: DemoGame[] }) {
  const [view, setView] = useState<string>(section.views[0] ?? "");
  return <div className="demo-shell">
    <Atmosphere />
    <a className="skip-link" href="#demo-content">Skip to demo content</a>
    <header className="demo-topbar"><Link href="/demo" aria-label="Demo overview"><BrandMark compact /></Link><strong className="beta-badge">BETA</strong><span>READ-ONLY DEMO</span><div><ThemeToggle /><Link href="/login" className="demo-exit">Exit demo</Link></div></header>
    <aside className="demo-notice"><strong>A look inside. Nothing to save.</strong><span>All data starts at zero. No personal account data is loaded. Browse pages and animations; features are disabled.</span></aside>
    <nav className="demo-nav" aria-label="Demo sections">{DEMO_SECTIONS.map(item => <Link key={item.id} href={item.id === "overview" ? "/demo" : `/demo/${item.id}`} aria-current={item.id === section.id ? "page" : undefined}>{item.label}</Link>)}</nav>
    <main id="demo-content" tabIndex={-1} className="demo-main"><div className="page-enter">
      {section.id === "overview" ? <section className="dashboard-hero demo-hero"><div className="hero-scene"><Sculpture priority /><div className="scene-coordinate">K / FORGED IN FOCUS</div></div><div className="hero-copy"><p className="eyebrow">YOUR DAY. YOUR DIRECTION. / BETA DEMO</p><h1>MAKE TIME.<br />MAKE IT <span>COUNT.</span></h1><p>{section.description}</p><div className="hero-actions"><Link className="primary-action" href="/demo/focus">Explore Focus</Link><Link className="text-action" href="/demo/schedule">See the schedule</Link></div></div></section> : <header className="demo-chapter"><div><p className="eyebrow">{section.label.toUpperCase()} / FEATURE PREVIEW</p><h1>{section.title}</h1><p>{section.description}</p></div><SectionScene section={section.id === "focus" ? "schedule" : section.id} /></header>}
      {section.views.length > 0 && <nav className="demo-views" aria-label={`${section.label} previews`}>{section.views.map(label => <button key={label} type="button" data-camera-tab aria-pressed={view === label} onClick={() => setView(label)}>{label}</button>)}</nav>}
      <div key={view} className="demo-view-enter"><Preview section={section.id} view={view} games={games} /></div>
      <footer className="studio-footer"><span>BETA / READ-ONLY PREVIEW</span><Link href="/login">Back to login</Link></footer>
    </div></main>
  </div>;
}
