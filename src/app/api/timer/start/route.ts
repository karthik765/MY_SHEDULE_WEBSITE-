import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Guards "at most one running session" across concurrent requests. Two Start
// clicks landing at the same moment both used to pass the "is one already
// running?" check and each create a session — real duplicates, milliseconds
// apart, are visible in the logged history. Taking a transaction-scoped
// advisory lock first makes the check-and-create atomic. The _xact_ variant
// matters: it releases on commit, so it stays correct through the pooled
// (PgBouncer) connection the app connects with.
const START_LOCK_KEY = 724100;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const subject = body.subject || "Study";

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${START_LOCK_KEY}::bigint)`;
    const existing = await tx.studySession.findFirst({ where: { endTime: null } });
    if (existing) return { session: existing, created: false };
    const session = await tx.studySession.create({
      data: { subject, startTime: new Date() },
    });
    return { session, created: true };
  });

  if (!result.created) {
    return NextResponse.json(
      { error: "A session is already running", session: result.session },
      { status: 409 }
    );
  }
  return NextResponse.json(result.session, { status: 201 });
}
