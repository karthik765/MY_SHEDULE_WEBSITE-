import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { DEMO_SECTIONS } from "@/lib/demo";

const PUBLIC_PATHS = ["/login", "/api/login", "/api/login/google", "/api/login/google/callback", "/cinematic/k-obsidian.png"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public display-only routes never grant a session or bypass protected APIs.
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    if (!["GET", "HEAD"].includes(request.method)) {
      return NextResponse.json({ error: "Demo is read-only" }, { status: 403 });
    }
    if (pathname !== "/demo" && !DEMO_SECTIONS.some(section => pathname === `/demo/${section.id}`)) {
      return NextResponse.json({ error: "Demo page not found" }, { status: 404 });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.loggedIn) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
