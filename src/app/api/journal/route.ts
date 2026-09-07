import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function GET() {
  const ownerEmail = await requireUserEmail();
  const entries = await prisma.journalEntry.findMany({ where: { ownerEmail }, orderBy: { date: "desc" } });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const ownerEmail = await requireUserEmail();
  const body = await request.json();
  const entry = await prisma.journalEntry.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      ownerEmail,
      content: body.content,
      mood: body.mood || null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
