import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.scheduleEvent.findMany({
    orderBy: [{ startTime: "asc" }],
  });
  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const event = await prisma.scheduleEvent.create({
    data: {
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
