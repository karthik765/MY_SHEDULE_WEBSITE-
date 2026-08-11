import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body.status !== undefined) {
    data.status = body.status === "completed" ? "completed" : "upcoming";
    data.completedAt = data.status === "completed" ? new Date() : null;
  }
  const item = await prisma.mediaItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.mediaItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
