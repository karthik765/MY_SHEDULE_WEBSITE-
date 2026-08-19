import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGoalLocked } from "@/lib/goals";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  if (isGoalLocked(goal)) {
    return NextResponse.json(
      { error: "This goal is finalized and locked until its target date." },
      { status: 403 }
    );
  }

  const count = await prisma.milestone.count({ where: { goalId: id } });
  const milestone = await prisma.milestone.create({
    data: { goalId: id, title: body.title, order: count },
  });
  return NextResponse.json(milestone, { status: 201 });
}
