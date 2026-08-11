import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const task = await prisma.task.create({
    data: {
      title: body.title,
      notes: body.notes || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      priority: body.priority || "medium",
      category: body.category === "monthly" ? "monthly" : "weekly",
    },
  });
  return NextResponse.json(task, { status: 201 });
}
