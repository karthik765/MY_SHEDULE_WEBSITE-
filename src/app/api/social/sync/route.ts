import { NextRequest } from "next/server";
import { getSocialState, socialRoute, syncOpenSessions } from "@/lib/social";

// Called on a heartbeat while a platform is open, and with { end: true }
// when the user presses "I'm done" or closes the tab (via sendBeacon).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return socialRoute(async () => {
    await syncOpenSessions(body?.end === true);
    return getSocialState();
  });
}
