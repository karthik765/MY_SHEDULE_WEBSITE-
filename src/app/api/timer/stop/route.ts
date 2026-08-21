import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Accepts an optional `endTime` (epoch ms): callers that know a session's
// intended cutoff (a Focus Mode block reaching its scheduled end while the
// tab was backgrounded/asleep) pass it so the recorded duration reflects
// that cutoff instead of whatever time the tab happened to wake back up —
// otherwise idle/away time between the scheduled end and the late timeout
// firing would get counted as focus time.
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

  const clampedMs =
    requestedEndTime != null
      ? Math.min(now, Math.max(active.startTime.getTime(), requestedEndTime))
      : now;
  const endTime = new Date(clampedMs);
  const durationMinutes = Math.max(
    1,
    Math.round((endTime.getTime() - active.startTime.getTime()) / 60000)
  );

  const session = await prisma.studySession.update({
    where: { id: active.id },
    data: { endTime, durationMinutes },
  });
  return NextResponse.json(session);
}
