import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ownerEmail = await requireUserEmail();
  const body = await request.json().catch(() => ({}));
  const dateStr: string = body.date || new Date().toISOString().slice(0, 10);
  const date = new Date(`${dateStr}T00:00:00.000Z`);

  const habit = await prisma.habit.findFirst({ where: { id, ownerEmail } });
  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: id, date } },
  });

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
    return NextResponse.json({ completed: false });
  }

  await prisma.habitLog.create({ data: { habitId: id, date, completed: true } });
  return NextResponse.json({ completed: true });
}
