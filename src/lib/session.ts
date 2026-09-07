import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  loggedIn: boolean;
  email?: string;
}

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "SESSION_SECRET env var must be set to a random string of at least 32 characters"
  );
}

export const sessionOptions: SessionOptions = {
  password: secret,
  cookieName: "life_app_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production" && process.env.LOCAL_PREVIEW_EMAIL_ONLY !== "1",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function requireUserEmail() {
  const session = await getSession();
  const email = session.email ?? process.env.ADMIN_EMAIL ?? "karthiksai1245@gmail.com";
  return normalizeEmail(email);
}
