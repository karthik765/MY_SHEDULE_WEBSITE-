import { getSocialState, socialRoute } from "@/lib/social";
import { requireUserEmail } from "@/lib/session";

export async function GET() {
  const ownerEmail = await requireUserEmail();
  return socialRoute(() => getSocialState(ownerEmail));
}
