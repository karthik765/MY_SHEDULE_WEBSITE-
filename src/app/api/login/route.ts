import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH;

  if (!expectedUsername || !expectedHash) {
    return NextResponse.json(
      { error: "Server is not configured: missing ADMIN_USERNAME or ADMIN_PASSWORD_HASH" },
      { status: 500 }
    );
  }

  const validUsername = username === expectedUsername;
  const validPassword =
    typeof password === "string" && (await bcrypt.compare(password, expectedHash));

  if (!validUsername || !validPassword) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const session = await getSession();
  session.loggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
