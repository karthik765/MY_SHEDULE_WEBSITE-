import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// The SocialSession table is created by `npx prisma db push`. Until that's
// run against the deployed database every query throws Prisma P2021 —
// turn that into a clear message instead of an opaque 500.
export async function socialRoute(fn: () => Promise<Response | unknown>): Promise<Response> {
  try {
    const result = await fn();
    return result instanceof Response ? result : NextResponse.json(result);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2021" || code === "P2022") {
      return NextResponse.json(
        { error: "Social isn't set up yet: run `npx prisma db push` on the database." },
        { status: 503 }
      );
    }
    console.error("social route error", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// 15 minutes, COMBINED across every platform, per local day.
export const DAILY_BUDGET_SECONDS = 15 * 60;

export const PLATFORMS = {
  x: { label: "X", url: "https://x.com/home" },
  instagram: { label: "Instagram", url: "https://www.instagram.com/" },
} as const;

export type Platform = keyof typeof PLATFORMS;

export function isPlatform(v: unknown): v is Platform {
  return v === "x" || v === "instagram";
}

// Start of "today" in the server's local timezone.
export function startOfToday(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function elapsedSeconds(openedAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - openedAt.getTime()) / 1000));
}

export interface SocialState {
  budgetSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
  active: { id: string; platform: Platform; url: string; openedAt: string } | null;
}

export async function getSocialState(now = new Date()): Promise<SocialState> {
  const sessions = await prisma.socialSession.findMany({
    where: { openedAt: { gte: startOfToday(now) } },
    orderBy: { openedAt: "asc" },
  });

  let used = 0;
  let active: SocialState["active"] = null;

  for (const s of sessions) {
    if (s.endedAt) {
      used += s.seconds;
    } else {
      used += elapsedSeconds(s.openedAt, now);
      if (isPlatform(s.platform)) {
        active = {
          id: s.id,
          platform: s.platform,
          url: PLATFORMS[s.platform].url,
          openedAt: s.openedAt.toISOString(),
        };
      }
    }
  }

  used = Math.min(used, DAILY_BUDGET_SECONDS);
  return {
    budgetSeconds: DAILY_BUDGET_SECONDS,
    usedSeconds: used,
    remainingSeconds: Math.max(0, DAILY_BUDGET_SECONDS - used),
    active,
  };
}

// Persist the accrued cost of every still-open session and mark it ended
// when `end` is set or the daily budget is already spent.
export async function syncOpenSessions(end: boolean, now = new Date()): Promise<void> {
  const open = await prisma.socialSession.findMany({ where: { endedAt: null } });
  if (open.length === 0) return;

  const state = await getSocialState(now);
  const budgetSpent = state.remainingSeconds <= 0;

  for (const s of open) {
    const seconds = elapsedSeconds(s.openedAt, now);
    const stale = now.getTime() - s.openedAt.getTime() > 24 * 60 * 60 * 1000;
    await prisma.socialSession.update({
      where: { id: s.id },
      data: {
        seconds,
        endedAt: end || budgetSpent || stale ? now : null,
      },
    });
  }
}
