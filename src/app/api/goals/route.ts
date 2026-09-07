import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function GET() {
  const ownerEmail = await requireUserEmail();
  const goals = await prisma.goal.findMany({
    where: { ownerEmail },
    orderBy: { createdAt: "desc" },
    include: { milestones: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(goals);
}

export async function POST(request: NextRequest) {
  const ownerEmail = await requireUserEmail();
  const body = await request.json();
  const goal = await prisma.goal.create({
    data: {
      title: body.title,
      ownerEmail,
      description: body.description || null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
    },
    include: { milestones: true },
  });
  return NextResponse.json(goal, { status: 201 });
}
