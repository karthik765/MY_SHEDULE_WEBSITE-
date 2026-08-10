import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const entries = await prisma.journalEntry.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const entry = await prisma.journalEntry.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      content: body.content,
      mood: body.mood || null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
