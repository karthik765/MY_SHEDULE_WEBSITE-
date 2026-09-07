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
  if (body.content !== undefined) data.content = body.content;
  if (body.mood !== undefined) data.mood = body.mood || null;
  const entry = await prisma.journalEntry.update({ where: { id, ownerEmail }, data });
  return NextResponse.json(entry);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ownerEmail = await requireUserEmail();
  await prisma.journalEntry.delete({ where: { id, ownerEmail } });
  return NextResponse.json({ ok: true });
}
