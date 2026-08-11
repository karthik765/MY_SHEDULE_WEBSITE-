import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedEmail || !expectedHash) {
    return NextResponse.json(
      { error: "Server is not configured: missing ADMIN_EMAIL or ADMIN_PASSWORD_HASH" },
      { status: 500 }
    );
  }

  const validEmail = typeof email === "string" && email.toLowerCase() === expectedEmail.toLowerCase();
  const validPassword =
    typeof password === "string" && (await bcrypt.compare(password, expectedHash));

  if (!validEmail || !validPassword) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const session = await getSession();
  session.loggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
