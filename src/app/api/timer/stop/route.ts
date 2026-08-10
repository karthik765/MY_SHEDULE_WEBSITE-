import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const active = await prisma.studySession.findFirst({
    where: { endTime: null },
    orderBy: { startTime: "desc" },
  });
  if (!active) {
    return NextResponse.json({ error: "No active session" }, { status: 404 });
  }

  const endTime = new Date();
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
