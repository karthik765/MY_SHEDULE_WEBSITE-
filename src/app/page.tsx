import Link from "next/link";
import FocusDial from "@/components/studio/FocusDial";
import Sculpture from "@/components/studio/Sculpture";
import Icon from "@/components/studio/Icon";
import { prisma } from "@/lib/prisma";
import { eventAppliesToDate, startOfWeek } from "@/lib/schedule";
import { computeStreak } from "@/lib/habits";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const weekStart = startOfWeek(now);

  const [events, tasks, sessions, habits, activeSession, goals] = await Promise.all([
    prisma.scheduleEvent.findMany({ orderBy: { startTime: "asc" } }),
    prisma.task.findMany({
      where: { completed: false },
      orderBy: { dueDate: "asc" },
    }),
    prisma.studySession.findMany({
      where: { startTime: { gte: weekStart } },
    }),
    prisma.habit.findMany({ include: { logs: { orderBy: { date: "desc" }, take: 60 } } }),
    prisma.studySession.findFirst({ where: { endTime: null } }),
    prisma.goal.findMany({ include: { milestones: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const todayEvents = events
    .filter((e) => eventAppliesToDate(e, now))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayKey = now.toISOString().slice(0, 10);
  const dueTodayOrOverdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toISOString().slice(0, 10) <= todayKey
  );

  const weeklyMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const weeklyHours = weeklyMinutes / 60;

  const longestStreak = habits.reduce((best, h) => Math.max(best, computeStreak(h.logs)), 0);
  const featuredGoal = goals.find(goal => goal.status === "active") ?? goals[0];
  const completedMilestones = featuredGoal?.milestones.filter(m => m.completed).length ?? 0;
  const goalPercent = featuredGoal?.milestones.length ? Math.round(completedMilestones / featuredGoal.milestones.length * 100) : featuredGoal?.status === "completed" ? 100 : 0;

  return (
    <div className="page-dashboard">
      <section className="dashboard-hero">
        <div className="hero-scene"><Sculpture active={!!activeSession} priority /><div className="scene-coordinate">K / FORGED IN FOCUS</div></div>
        <div className="hero-copy">
          <p className="eyebrow"><span />YOUR DAY. YOUR DIRECTION.</p>
          <h1>MAKE TIME.<br />MAKE IT <span>COUNT.</span></h1>
          <p>Your attention is your most valuable asset.</p>
          <div className="hero-actions"><Link href="/focus" className="primary-action">ENTER FOCUS<Icon name="arrow" size={19} /></Link><Link href="/schedule" className="text-action">Plan your day<Icon name="arrow" size={17} /></Link></div>
          <div className="hero-footnote"><span className="hero-index">01</span><span>STAY DISCIPLINED.<br />WIN THE DAY.</span></div>
        </div>
        <time className="hero-date">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "2-digit" })}</time>
        <FocusDial startedAt={activeSession?.startTime.toISOString() ?? null} initialNow={now.toISOString()} />
      </section>
      <div className="dashboard-stats">
        <div className="studio-stat"><p className="stat-label"><Icon name="focus" size={14} />FOCUS THIS WEEK</p><p className="stat-value">{weeklyHours.toFixed(1)} <small>hours</small></p><p className="stat-note">ATTENTION, WELL INVESTED</p></div>
        <div className="studio-stat"><p className="stat-label"><Icon name="habits" size={14} />TASKS TODAY</p><p className="stat-value">{dueTodayOrOverdue.length} <small>due</small></p><p className="stat-note">TODAY AND EARLIER</p></div>
        <div className="studio-stat"><p className="stat-label"><Icon name="goals" size={14} />CURRENT STREAK</p><p className="stat-value">{String(longestStreak).padStart(2, "0")} <small>days</small></p><p className="stat-note">KEEP SHOWING UP</p></div>
      </div>
      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <div className="panel-heading"><h2><span className="eyebrow">TODAY /</span> Your next moves</h2><Link href="/schedule" className="text-action">View schedule<Icon name="arrow" size={13} /></Link></div>
          {todayEvents.length === 0 ? <div className="empty-state"><strong>A little breathing room.</strong><p>Your schedule is open today. Give something meaningful a place in it.</p><Link href="/schedule"><Icon name="plus" size={14} />Plan your first moment</Link></div> : <div className="timeline-list">{todayEvents.map(e => <div key={e.id} className="timeline-row"><time>{e.startTime}</time><div className="timeline-entry"><strong>{e.title}</strong><p>{e.startTime} - {e.endTime}</p></div></div>)}</div>}
        </section>
        <section className="dashboard-panel goal-spotlight">
          <div className="goal-landscape" aria-hidden="true"><i /><i /><i /></div>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h2>BUILD SOMETHING<br />THAT MATTERS.</h2>
          <p className="spotlight-title">{featuredGoal ? featuredGoal.title : "Big things start with a single step."}</p>
          <div className="spotlight-progress"><span><i style={{ width: `${goalPercent}%` }} /></span><strong>{goalPercent}%</strong></div>
          <div className="spotlight-footer"><span>{featuredGoal ? `${completedMilestones} of ${featuredGoal.milestones.length} milestones complete` : "Set a goal. Give it your attention."}</span><Link href="/goals" className="text-action">{featuredGoal ? "View your goals" : "Create a goal"}<Icon name="arrow" size={15} /></Link></div>
        </section>
      </div>
      <div className="dashboard-secondary">
        <section className="dashboard-panel">
          <div className="panel-heading"><h2><Icon name="habits" size={17} />Your next small steps</h2><Link href="/schedule?tab=tasks" className="text-action">All tasks<Icon name="arrow" size={13} /></Link></div>
          {dueTodayOrOverdue.length === 0 ? <div className="empty-state"><strong>All caught up.</strong><p>Nothing is due right now. Enjoy the space, or choose your next small step.</p><Link href="/schedule?tab=tasks"><Icon name="plus" size={14} />Add a task</Link></div> : <div>{dueTodayOrOverdue.slice(0,6).map(t => <Link href="/schedule?tab=tasks" key={t.id} className="task-row"><span /><strong>{t.title}</strong><time>{t.dueDate && new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time></Link>)}</div>}
        </section>
      <section className="dashboard-panel dashboard-habits">
        <div className="panel-heading"><h2><Icon name="goals" size={17} />The things you keep showing up for</h2><Link href="/habits" className="text-action">Your habits<Icon name="arrow" size={13} /></Link></div>
        {habits.length === 0 ? <div className="empty-state"><strong>Start something worth repeating.</strong><p>A few pages. A short walk. Your first ritual starts here.</p><Link href="/habits"><Icon name="plus" size={14} />Create a habit</Link></div> : <div className="habit-strip">{habits.map(h => <Link href="/habits" key={h.id} className="habit-preview"><strong>{h.name}</strong><p><span>{computeStreak(h.logs)} days</span> of showing up</p></Link>)}</div>}
      </section>
      </div>
    </div>
  );
}
