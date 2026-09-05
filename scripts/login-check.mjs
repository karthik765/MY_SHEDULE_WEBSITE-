import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { once } from "node:events";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { chromium } = require(process.argv.find(arg => arg.startsWith("--playwright="))?.slice(13) || "playwright");
const password = randomBytes(24).toString("hex");
const hash = await bcrypt.hash(password, 10);
const browser = await chromium.launch({ headless: true });
try {
  for (const emailOnly of [false, true]) {
    const email = emailOnly ? "local-preview-account" : "preview-test@example.invalid";
    const port = emailOnly ? 3102 : 3101;
    const origin = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
      env: { ...process.env, SESSION_SECRET: randomBytes(32).toString("hex"), ADMIN_EMAIL: email, ADMIN_PASSWORD_HASH: hash, LOCAL_PREVIEW_EMAIL_ONLY: emailOnly ? "1" : "0" },
      stdio: "ignore", windowsHide: true,
    });
    const stopped = once(server, "exit");
    const context = await browser.newContext();
    try {
      let ready = false;
      for (let i = 0; i < 60; i++) {
        try { ready = (await fetch(origin + "/login")).ok; } catch {}
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      assert.ok(ready, "Test server started");
      const protectedPage = await fetch(origin + "/", { redirect: "manual" });
      assert.equal(protectedPage.status, 307, "Logged-out visitors still require a session");
      const post = body => context.request.post(origin + "/api/login", { data: body });
      assert.equal((await post({ email: "wrong@example.invalid" })).status(), 401);
      if (!emailOnly) {
        assert.equal((await post({ email })).status(), 401, "Normal mode rejects missing password");
        assert.equal((await post({ email, password: "incorrect" })).status(), 401);
        const valid = await post({ email, password });
        assert.equal(valid.status(), 200, "Normal mode accepts valid credentials");
        assert.match(valid.headers()["set-cookie"], /; Secure/i);
        await context.clearCookies();
      }
      const page = await context.newPage();
      // Keep browser verification from triggering existing GET-side database mutations.
      await page.route("**/api/**", route => new URL(route.request().url()).pathname === "/api/login" ? route.continue() : route.fulfill({ status: 200, json: {} }));
      await page.goto(origin + "/login", { waitUntil: "networkidle" });
      assert.equal(await page.locator('input[type="password"]').count(), emailOnly ? 0 : 1);
      assert.equal(await page.locator('input[type="email"]').count(), emailOnly ? 0 : 1);
      if (emailOnly) {
        const loginResponse = page.waitForResponse(response => response.url() === origin + "/api/login");
        await page.getByRole("button", { name: "Enter your space" }).click();
        assert.equal((await loginResponse).status(), 200);
        await page.waitForURL(origin + "/");
        await page.locator("h1").first().waitFor();
        await page.reload();
        assert.equal(new URL(page.url()).pathname, "/", "Preview session persists after reload");
      }
      console.log(emailOnly ? "PASS: one-click preview entry works with a legacy account setting and persists session" : "PASS: normal mode shows and enforces password, secure cookie enabled");
    } finally {
      await context.close();
      server.kill();
      await stopped;
    }
  }
} finally {
  await browser.close();
}
