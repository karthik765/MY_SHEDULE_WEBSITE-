import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

// Returns the flat list of every node; the client groups them into a tree
// by parentId. Depth is unbounded, so building the tree client-side avoids
// having to hardcode a recursion limit in a Prisma `include`.
export async function GET() {
  const ownerEmail = await requireUserEmail();
  const topics = await prisma.topicNode.findMany({
    where: { ownerEmail },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(topics);
}

export async function POST(request: NextRequest) {
  const ownerEmail = await requireUserEmail();
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const parentId = body.parentId ? String(body.parentId) : null;

  if (parentId) {
    const parent = await prisma.topicNode.findFirst({ where: { id: parentId, ownerEmail } });
    if (!parent) {
      return NextResponse.json({ error: "Parent topic not found" }, { status: 404 });
    }
  }

  const siblingCount = await prisma.topicNode.count({ where: { ownerEmail, parentId } });
  const topic = await prisma.topicNode.create({
    data: { ownerEmail, name, parentId, order: siblingCount },
  });
  return NextResponse.json(topic, { status: 201 });
}
