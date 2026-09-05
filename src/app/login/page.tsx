import { connection } from "next/server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  await connection();
  const emailOnly = process.env.LOCAL_PREVIEW_EMAIL_ONLY === "1";
  return <LoginForm emailOnly={emailOnly} initialEmail={emailOnly ? process.env.ADMIN_EMAIL?.trim() ?? "" : ""} />;
}
