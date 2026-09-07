import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/session";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ownerEmail = await requireUserEmail();
  await prisma.studySession.delete({ where: { id, ownerEmail } });
  return NextResponse.json({ ok: true });
}
