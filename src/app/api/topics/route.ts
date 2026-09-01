import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns the flat list of every node; the client groups them into a tree
// by parentId. Depth is unbounded, so building the tree client-side avoids
// having to hardcode a recursion limit in a Prisma `include`.
export async function GET() {
  const topics = await prisma.topicNode.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(topics);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const parentId = body.parentId ? String(body.parentId) : null;

  if (parentId) {
    const parent = await prisma.topicNode.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: "Parent topic not found" }, { status: 404 });
    }
  }

  const siblingCount = await prisma.topicNode.count({ where: { parentId } });
  const topic = await prisma.topicNode.create({
    data: { name, parentId, order: siblingCount },
  });
  return NextResponse.json(topic, { status: 201 });
}
