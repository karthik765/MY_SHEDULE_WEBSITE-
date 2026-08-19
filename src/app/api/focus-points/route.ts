import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One minute of logged focus time = one Focus Point, all-time total (not
// scoped to any week/day).
export async function GET() {
  const result = await prisma.studySession.aggregate({
    _sum: { durationMinutes: true },
  });
  return NextResponse.json({ points: result._sum.durationMinutes ?? 0 });
}
