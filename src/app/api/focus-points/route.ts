import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyAutoPenalties } from "@/lib/penalties";
import { requireUserEmail } from "@/lib/session";

// One minute of logged focus time = one Focus Point, plus/minus the
// FocusPointAdjustment ledger (minigame bonuses, task/goal/habit failure
// penalties). The ledger never touches StudySession, so the underlying
// "hours focused" history stays exactly what you actually logged.
export async function GET() {
  const ownerEmail = await requireUserEmail();
  await applyAutoPenalties(ownerEmail);

  const [studyTotal, adjustmentTotal] = await Promise.all([
    prisma.studySession.aggregate({ where: { ownerEmail }, _sum: { durationMinutes: true } }),
    prisma.focusPointAdjustment.aggregate({ where: { ownerEmail }, _sum: { amount: true } }),
  ]);

  const points = Math.max(
    0,
    (studyTotal._sum.durationMinutes ?? 0) + (adjustmentTotal._sum.amount ?? 0)
  );
  return NextResponse.json({ points });
}
