import { getSocialState, socialRoute } from "@/lib/social";

export async function GET() {
  return socialRoute(() => getSocialState());
}
