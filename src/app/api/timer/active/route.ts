import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const active = await prisma.studySession.findFirst({
    where: { endTime: null },
    orderBy: { startTime: "desc" },
  });
  return NextResponse.json(active);
}
