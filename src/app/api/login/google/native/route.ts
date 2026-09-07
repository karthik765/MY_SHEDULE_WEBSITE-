import { NextRequest, NextResponse } from "next/server";
import { getSession, normalizeEmail } from "@/lib/session";

function loginUrl(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("google", error);
  return url;
}

export async function POST(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Google login is not configured" }, { status: 500 });

  const body = (await request.json().catch(() => null)) as { idToken?: string } | null;
  const idToken = body?.idToken;
  if (!idToken) return NextResponse.json({ error: "Missing Google token" }, { status: 400 });

  const tokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!tokenResponse.ok) return NextResponse.json({ error: "Google token could not be verified" }, { status: 401 });

  const token = (await tokenResponse.json()) as { aud?: string; email?: string; email_verified?: string | boolean };
  const emailVerified = token.email_verified === true || token.email_verified === "true";
  if (token.aud !== clientId || !emailVerified || !token.email?.trim()) {
    return NextResponse.redirect(loginUrl(request, "denied"));
  }

  const session = await getSession();
  session.loggedIn = true;
  session.email = normalizeEmail(token.email);
  await session.save();

  return NextResponse.json({ ok: true });
}
