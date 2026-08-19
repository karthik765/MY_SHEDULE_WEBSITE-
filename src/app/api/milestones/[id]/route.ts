import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGoalLocked } from "@/lib/goals";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const milestone = await prisma.milestone.update({
    where: { id },
    data: { completed: body.completed },
  });
  return NextResponse.json(milestone);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const milestone = await prisma.milestone.findUnique({ where: { id }, include: { goal: true } });
  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }
  if (isGoalLocked(milestone.goal)) {
    return NextResponse.json(
      { error: "This goal is finalized and locked until its target date." },
      { status: 403 }
    );
  }

  await prisma.milestone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
