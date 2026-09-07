import { NextRequest } from "next/server";
import { getSocialState, socialRoute, syncOpenSessions } from "@/lib/social";
import { requireUserEmail } from "@/lib/session";

// Called on a heartbeat while a platform is open, and with { end: true }
// when the user presses "I'm done" or closes the tab (via sendBeacon).
export async function POST(request: NextRequest) {
  const ownerEmail = await requireUserEmail();
  const body = await request.json().catch(() => ({}));
  return socialRoute(async () => {
    await syncOpenSessions(ownerEmail, body?.end === true);
    return getSocialState(ownerEmail);
  });
}
