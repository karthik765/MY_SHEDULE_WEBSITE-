import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGoalLocked } from "@/lib/goals";
import { requireUserEmail } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ownerEmail = await requireUserEmail();
  const body = await request.json();
  const current = await prisma.milestone.findFirst({ where: { id, goal: { ownerEmail } }, include: { goal: true } });
  if (!current) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }
  if (isGoalLocked(current.goal)) {
    return NextResponse.json(
      { error: "This goal is finalized and locked until its target date." },
      { status: 403 }
    );
  }
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
  const ownerEmail = await requireUserEmail();

  const milestone = await prisma.milestone.findFirst({ where: { id, goal: { ownerEmail } }, include: { goal: true } });
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
