import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function GET() {
  const ownerEmail = await requireUserEmail();
  const sessions = await prisma.studySession.findMany({
    where: { ownerEmail },
    orderBy: { startTime: "desc" },
    take: 200,
  });
  return NextResponse.json(sessions);
}
