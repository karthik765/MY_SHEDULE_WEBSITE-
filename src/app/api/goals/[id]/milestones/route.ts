import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const count = await prisma.milestone.count({ where: { goalId: id } });
  const milestone = await prisma.milestone.create({
    data: { goalId: id, title: body.title, order: count },
  });
  return NextResponse.json(milestone, { status: 201 });
}
