import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SLOW_RATE, isSlowSubject, nonFocusedMakeUpReason } from "@/lib/focusSessions";

// Accepts an optional `endTime` (epoch ms): callers that know a session's
// intended cutoff (a Classic Mode block reaching its scheduled end while the
// tab was backgrounded/asleep) pass it so the recorded duration reflects
// that cutoff instead of whatever time the tab happened to wake back up —
// otherwise idle/away time between the scheduled end and the late timeout
// firing would get counted as focus time.
//
// The Non-Focused 0.5x discount is applied here rather than by the caller,
// so it holds however the session gets stopped — the Stop button, a stale
// session cleared on the next start, or anything else.
export async function POST(request: NextRequest) {
  const active = await prisma.studySession.findFirst({
    where: { endTime: null },
    orderBy: { startTime: "desc" },
  });
  if (!active) {
    return NextResponse.json({ error: "No active session" }, { status: 404 });
  }

  const now = Date.now();
  let requestedEndTime: number | undefined;
  try {
    const body = await request.json();
    if (typeof body?.endTime === "number") requestedEndTime = body.endTime;
  } catch {
    // no body provided — fall back to now
  }

  const startMs = active.startTime.getTime();
  const clampedMs =
    requestedEndTime != null ? Math.min(now, Math.max(startMs, requestedEndTime)) : now;

  const realMs = clampedMs - startMs;
  const slow = isSlowSubject(active.subject);
  const durationMinutes = Math.max(1, Math.round((slow ? realMs * SLOW_RATE : realMs) / 60000));

  // endTime stays the real moment it stopped; durationMinutes is the credited
  // study time, which is what every stat in the app reads.
  const session = await prisma.studySession.update({
    where: { id: active.id },
    data: { endTime: new Date(clampedMs), durationMinutes },
  });

  if (slow) {
    const realMinutes = Math.max(1, Math.round(realMs / 60000));
    const makeUp = realMinutes - durationMinutes;
    if (makeUp > 0) {
      await prisma.focusPointAdjustment.create({
        data: { amount: makeUp, reason: nonFocusedMakeUpReason(active.id) },
      });
    }
  }

  return NextResponse.json(session);
}
