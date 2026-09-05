import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;
  // Only the loopback-bound preview launcher enables temporary email-only access.
  const emailOnly = process.env.LOCAL_PREVIEW_EMAIL_ONLY === "1";

  if (!expectedEmail || (!emailOnly && !expectedHash)) {
    return NextResponse.json(
      { error: "Server is not configured: missing ADMIN_EMAIL or ADMIN_PASSWORD_HASH" },
      { status: 500 }
    );
  }

  const validEmail = typeof email === "string" && email.trim().toLowerCase() === expectedEmail.trim().toLowerCase();
  const validPassword =
    emailOnly || (typeof password === "string" && !!expectedHash && (await bcrypt.compare(password, expectedHash)));

  if (!validEmail || !validPassword) {
    return NextResponse.json({ error: emailOnly ? "Email does not match your account" : "Invalid email or password" }, { status: 401 });
  }

  const session = await getSession();
  session.loggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
