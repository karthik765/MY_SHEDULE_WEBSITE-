import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const existing = await prisma.studySession.findFirst({ where: { endTime: null } });
  if (existing) {
    return NextResponse.json(
      { error: "A session is already running", session: existing },
      { status: 409 }
    );
  }

  const body = await request.json();
  const session = await prisma.studySession.create({
    data: {
      subject: body.subject || "Study",
      startTime: new Date(),
    },
  });
  return NextResponse.json(session, { status: 201 });
}
