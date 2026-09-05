import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { sealData } from "iron-session";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { chromium } = require(process.argv.find(arg => arg.startsWith("--playwright="))?.slice(13) || "playwright");
const secret = randomBytes(32).toString("hex");
const origin = "http://127.0.0.1:3103";
// An unreachable database proves the public tour does not depend on owner data.
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", "3103"], {
  env: { ...process.env, SESSION_SECRET: secret, LOCAL_PREVIEW_EMAIL_ONLY: "0", DATABASE_URL: "postgresql://demo:demo@127.0.0.1:1/demo?connect_timeout=1" },
  stdio: "ignore", windowsHide: true,
});
const stopped = once(server, "exit");
const browser = await chromium.launch({ headless: true });
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { ready = (await fetch(origin + "/demo")).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Demo renders with no database available");
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [], apiRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => {
    apiRequests.push(route.request().url());
    return route.abort();
  });
  await page.addInitScript(() => localStorage.setItem("private-demo-test", "OWNER_PRIVATE_CANARY"));
  await page.goto(origin + "/login", { waitUntil: "networkidle" });
  assert.ok(await page.getByText("BETA", { exact: true }).isVisible());
  assert.equal(await page.getByText(/sign up/i).count(), 0);
  await page.getByRole("link", { name: "Explore Demo" }).click();
  await page.waitForURL(origin + "/demo");
  const sections = ["", "/focus", "/schedule", "/habits", "/goals", "/topics", "/minigames", "/social", "/trophies", "/focus-points", "/analytics"];
  await mkdir(".design-sync/demo-preview", { recursive: true });
  for (const section of sections) {
    const response = await page.goto(origin + "/demo" + section, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200, section || "Overview");
    assert.equal(await page.locator("main h1").count(), 1);
    assert.ok(!(await page.content()).includes("OWNER_PRIVATE_CANARY"));
    assert.equal(await page.locator("input, textarea, form").count(), 0, "No editable account or game forms");
    for (const button of await page.locator(".demo-main button:not([data-camera-tab])").all()) assert.ok(await button.isDisabled());
    for (const tab of await page.locator(".demo-views button").all()) {
      await tab.click();
      assert.equal(await tab.getAttribute("aria-pressed"), "true");
    }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(800);
      if (!(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))) {
        console.log(await page.locator("body *").evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(el => ({ tag: el.tagName, className: el.className, right: el.getBoundingClientRect().right }))));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No overflow ${section} at ${width}`);
      assert.ok(await page.getByRole("link", { name: "Exit demo", exact: true }).isVisible());
    }
    if (["", "/focus", "/minigames"].includes(section)) await page.screenshot({ path: `.design-sync/demo-preview/${section.slice(1) || "overview"}-mobile.png` });
  }
  assert.deepEqual(apiRequests, [], "Demo never requests private APIs");
  assert.deepEqual(errors, [], "No browser errors");
  assert.equal((await context.cookies()).some(c => c.name === "life_app_session"), false, "No demo auth session issued");
  for (const path of ["/api/tasks", "/api/timer/active", "/api/achievements", "/api/focus-points", "/api/social", "/api/goals/private-id"]) {
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      assert.equal((await fetch(origin + path, { method })).status, 401, `${method} ${path} remains protected`);
    }
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal((await fetch(origin + "/demo/focus", { method })).status, 403);
  assert.equal((await fetch(origin + "/demo/api/tasks")).status, 404);
  assert.equal((await fetch(origin + "/demo/unknown")).status, 404);
  assert.equal((await fetch(origin + "/", { redirect: "manual" })).status, 307);
  const cookie = await sealData({ loggedIn: true }, { password: secret });
  await context.addCookies([{ name: "life_app_session", value: cookie, url: origin, httpOnly: true }]);
  await page.goto(origin + "/demo/focus", { waitUntil: "networkidle" });
  assert.ok(await page.getByText("No session in progress", { exact: true }).isVisible());
  assert.ok(await page.getByText("00:00:00", { exact: true }).isVisible());
  assert.equal((await context.cookies()).find(c => c.name === "life_app_session").value, cookie, "Existing owner cookie unchanged");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: ".design-sync/demo-preview/focus-desktop.png" });
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Reduced motion" }).waitFor();
  assert.equal(await page.locator(".demo-timer-orbit").evaluate(el => getComputedStyle(el).animationName), "none");
  await page.getByRole("link", { name: "Exit demo", exact: true }).click();
  await page.waitForURL(origin + "/login");
  assert.equal((await context.cookies()).find(c => c.name === "life_app_session").value, cookie);
  assert.deepEqual(apiRequests, []);
  assert.deepEqual(errors, []);
  console.log("PASS: Beta login, all 11 demo pages and inner views, zero private API calls, database-independent rendering, read-only enforcement, owner-session isolation, mobile layouts, themes and reduced motion.");
  await context.close();
} finally {
  await browser.close();
  server.kill();
  await stopped;
}
