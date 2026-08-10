import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sessions = await prisma.studySession.findMany({
    orderBy: { startTime: "desc" },
    take: 200,
  });
  return NextResponse.json(sessions);
}
