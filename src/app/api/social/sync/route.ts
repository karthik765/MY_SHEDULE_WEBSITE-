import { NextRequest, NextResponse } from "next/server";
import { getSocialState, syncOpenSessions } from "@/lib/social";

// Called on a heartbeat while a platform is open, and with { end: true }
// when the user presses "I'm done" or closes the tab (via sendBeacon).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  await syncOpenSessions(body?.end === true);
  return NextResponse.json(await getSocialState());
}
