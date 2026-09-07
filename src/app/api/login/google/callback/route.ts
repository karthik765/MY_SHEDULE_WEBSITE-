import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const STATE_COOKIE = "google_oauth_state";

function loginUrl(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("google", error);
  return url;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(loginUrl(request, "setup"));

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !state || state !== expectedState) return NextResponse.redirect(loginUrl(request, "failed"));

  const redirectUri = new URL("/api/login/google/callback", request.url).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenResponse.ok) return NextResponse.redirect(loginUrl(request, "failed"));

  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) return NextResponse.redirect(loginUrl(request, "failed"));

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) return NextResponse.redirect(loginUrl(request, "failed"));

  const profile = (await profileResponse.json()) as { email?: string; email_verified?: boolean };
  if (!profile.email_verified || !profile.email?.trim()) {
    return NextResponse.redirect(loginUrl(request, "denied"));
  }

  const session = await getSession();
  session.loggedIn = true;
  await session.save();

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}

