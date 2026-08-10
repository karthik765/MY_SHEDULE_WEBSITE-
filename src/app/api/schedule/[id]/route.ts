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
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.startTime !== undefined) data.startTime = body.startTime;
  if (body.endTime !== undefined) data.endTime = body.endTime;
  if (body.recurring !== undefined) data.recurring = body.recurring;
  if (body.weekday !== undefined) data.weekday = body.weekday;
  if (body.notes !== undefined) data.notes = body.notes || null;

  const event = await prisma.scheduleEvent.update({ where: { id }, data });
  return NextResponse.json(event);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.scheduleEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
