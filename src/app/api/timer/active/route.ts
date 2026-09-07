import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function GET() {
  const ownerEmail = await requireUserEmail();
  const active = await prisma.studySession.findFirst({
    where: { ownerEmail, endTime: null },
    orderBy: { startTime: "desc" },
  });
  return NextResponse.json(active);
}
