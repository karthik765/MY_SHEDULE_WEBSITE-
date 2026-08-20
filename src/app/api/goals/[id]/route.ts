import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGoalLocked } from "@/lib/goals";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const current = await prisma.goal.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const changingLockedFields = body.title !== undefined || body.description !== undefined || body.targetDate !== undefined;
  if (changingLockedFields && isGoalLocked(current)) {
    return NextResponse.json(
      { error: "This goal is finalized and locked until its target date." },
      { status: 403 }
    );
  }

  if (body.status === "completed") {
    const proof = body.proofUrl !== undefined ? body.proofUrl : current.proofUrl;
    if (!proof || !String(proof).trim()) {
      return NextResponse.json(
        { error: "Proof (a link or an uploaded image) is required to mark a goal complete." },
        { status: 400 }
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.targetDate !== undefined)
    data.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  if (body.status !== undefined) data.status = body.status;
  if (body.locked !== undefined) data.locked = body.locked;
  if (body.proofUrl !== undefined) data.proofUrl = body.proofUrl || null;

  const goal = await prisma.goal.update({
    where: { id },
    data,
    include: { milestones: true },
  });
  return NextResponse.json(goal);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const current = await prisma.goal.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  if (isGoalLocked(current)) {
    return NextResponse.json(
      { error: "This goal is finalized and locked until its target date." },
      { status: 403 }
    );
  }

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
