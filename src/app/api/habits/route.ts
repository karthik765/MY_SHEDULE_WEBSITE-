import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function GET() {
  const ownerEmail = await requireUserEmail();
  const habits = await prisma.habit.findMany({
    where: { ownerEmail },
    orderBy: { createdAt: "asc" },
    include: { logs: { orderBy: { date: "desc" }, take: 90 } },
  });
  return NextResponse.json(habits);
}

export async function POST(request: NextRequest) {
  const ownerEmail = await requireUserEmail();
  const body = await request.json();
  const habit = await prisma.habit.create({
    data: { ownerEmail, name: body.name, frequency: body.frequency || "daily" },
    include: { logs: true },
  });
  return NextResponse.json(habit, { status: 201 });
}
