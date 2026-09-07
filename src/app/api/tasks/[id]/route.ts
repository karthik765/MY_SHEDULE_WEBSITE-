import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ownerEmail = await requireUserEmail();
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.category !== undefined) data.category = body.category === "monthly" ? "monthly" : "weekly";
  if (body.completed !== undefined) data.completed = body.completed;

  const task = await prisma.task.update({ where: { id, ownerEmail }, data });
  return NextResponse.json(task);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ownerEmail = await requireUserEmail();
  await prisma.task.delete({ where: { id, ownerEmail } });
  return NextResponse.json({ ok: true });
}
