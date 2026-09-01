import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = new Set(["planned", "learning", "completed", "not_useful"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const current = await prisma.topicNode.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }
  if (body.status !== undefined) data.status = body.status;

  const topic = await prisma.topicNode.update({ where: { id }, data });
  return NextResponse.json(topic);
}

// Deleting a node cascades to every descendant (onDelete: Cascade in the
// schema) — removing a whole branch removes everything under it.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const current = await prisma.topicNode.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }
  await prisma.topicNode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
