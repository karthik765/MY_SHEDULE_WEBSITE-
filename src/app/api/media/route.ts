import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

const CATEGORIES = new Set(["movie", "webseries", "game"]);

export async function GET(request: NextRequest) {
  const ownerEmail = await requireUserEmail();
  const category = request.nextUrl.searchParams.get("category");
  const items = await prisma.mediaItem.findMany({
    where: category && CATEGORIES.has(category) ? { ownerEmail, category } : { ownerEmail },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const ownerEmail = await requireUserEmail();
  const body = await request.json();
  if (!CATEGORIES.has(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const status = body.status === "completed" ? "completed" : "upcoming";
  const item = await prisma.mediaItem.create({
    data: {
      category: body.category,
      ownerEmail,
      title: body.title,
      notes: body.notes || null,
      imageUrl: body.imageUrl || null,
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
