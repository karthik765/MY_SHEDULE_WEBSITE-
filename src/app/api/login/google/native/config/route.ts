import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    webClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  });
}
