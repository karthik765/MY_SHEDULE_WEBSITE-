import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const records = await prisma.gameRecord.findMany();
  return NextResponse.json(records);
}
