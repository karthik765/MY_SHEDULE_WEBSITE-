import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function GET() {
  const ownerEmail = await requireUserEmail();
  const events = await prisma.scheduleEvent.findMany({
    where: { ownerEmail },
    orderBy: [{ startTime: "asc" }],
  });
  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const ownerEmail = await requireUserEmail();
  const body = await request.json();
  const event = await prisma.scheduleEvent.create({
    data: {
      ownerEmail,
      title: body.title,
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
      recurring: body.recurring || "none",
      weekday: body.recurring === "weekly" ? body.weekday : null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(event, { status: 201 });
}
