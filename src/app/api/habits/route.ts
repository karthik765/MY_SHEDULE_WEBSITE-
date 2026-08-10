import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const habits = await prisma.habit.findMany({
    orderBy: { createdAt: "asc" },
    include: { logs: { orderBy: { date: "desc" }, take: 90 } },
  });
  return NextResponse.json(habits);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const habit = await prisma.habit.create({
    data: { name: body.name, frequency: body.frequency || "daily" },
    include: { logs: true },
  });
  return NextResponse.json(habit, { status: 201 });
}
