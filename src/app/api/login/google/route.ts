import { NextRequest, NextResponse } from "next/server";

const STATE_COOKIE = "google_oauth_state";

function loginUrl(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("google", error);
  return url;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(loginUrl(request, "setup"));

  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/login/google/callback", request.url).toString();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}