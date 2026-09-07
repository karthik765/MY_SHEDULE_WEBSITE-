import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function GET() {
  const ownerEmail = await requireUserEmail();
  const records = await prisma.gameRecord.findMany({ where: { ownerEmail } });
  return NextResponse.json(records);
}
