import { NextResponse } from "next/server";
import { getSocialState } from "@/lib/social";

export async function GET() {
  return NextResponse.json(await getSocialState());
}
