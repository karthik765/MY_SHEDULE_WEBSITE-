import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { describeFocusReason } from "@/lib/focusHistory";

const HISTORY_LIMIT = 1000;

interface HistoryEntry {
  id: string;
  amount: number;
  label: string;
  at: string;
}

// Unified, most-recent-first ledger of every focus-point gain/loss: logged
// study time (positive) plus every FocusPointAdjustment (game rewards, loss
// penalties, task/goal/habit penalties). Capped at the most recent 1000
// entries combined — cheap enough to fetch in one shot for a single-user app.
export async function GET() {
  const [sessions, adjustments] = await Promise.all([
    prisma.studySession.findMany({
      where: { durationMinutes: { not: null } },
      orderBy: { endTime: "desc" },
      take: HISTORY_LIMIT,
    }),
    prisma.focusPointAdjustment.findMany({
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    }),
  ]);

  const entries: HistoryEntry[] = [
    ...sessions.map((s) => ({
      id: `study:${s.id}`,
      amount: s.durationMinutes ?? 0,
      label: `Focus session: ${s.subject}`,
      at: (s.endTime ?? s.startTime).toISOString(),
    })),
    ...adjustments.map((a) => ({
      id: `adj:${a.id}`,
      amount: a.amount,
      label: describeFocusReason(a.reason),
      at: a.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, HISTORY_LIMIT);

  return NextResponse.json(entries);
}
