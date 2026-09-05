import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { sealData } from "iron-session";
import { PrismaClient } from "@prisma/client";
import { ACHIEVEMENTS, trophyCounts } from "../src/lib/achievements.ts";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
const secret = randomBytes(32).toString("hex");
const env = { ...process.env, SESSION_SECRET: secret, LOCAL_PREVIEW_EMAIL_ONLY: "0" };
const nextBin = require.resolve("next/dist/bin/next");

if (process.argv.includes("--build")) {
  const build = spawn(process.execPath, [nextBin, "build"], { env, stdio: "inherit", windowsHide: true });
  build.on("exit", code => { process.exitCode = code ?? 1; });
} else if (process.argv.includes("--serve")) {
  env.LOCAL_PREVIEW_EMAIL_ONLY = "1";
  const port = Number(process.env.STUDIO_PREVIEW_PORT || 3100);
  const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], { env, stdio: "inherit", windowsHide: true });
  console.log(`Local preview: http://127.0.0.1:${port} (temporary email-only login; loopback access only)`);
  server.on("error", error => { console.error(error); process.exitCode = 1; });
  server.on("exit", code => { process.exitCode = code ?? 1; });
  process.on("SIGINT", () => server.kill());
  process.on("SIGTERM", () => server.kill());
} else {
  const { chromium } = require(process.argv.find(arg => arg.startsWith("--playwright="))?.slice(13) || process.env.STUDIO_PLAYWRIGHT || "playwright");
  const database = new PrismaClient();
  const port = Number(process.env.STUDIO_PREVIEW_PORT || 3100);
  const origin = "http://127.0.0.1:" + port;
  const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  server.stdout.resume();
  server.stderr.resume();
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { const response = await fetch(origin + "/login"); if (response.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Local preview did not start.");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const outputDir = resolve(".design-sync/chapters-preview");
    await mkdir(outputDir, { recursive: true });

    // Preview GETs must not award achievements, apply penalties, or close social sessions.
    const [study, adjustments, unlocked] = await Promise.all([
      database.studySession.aggregate({ _sum: { durationMinutes: true } }),
      database.focusPointAdjustment.aggregate({ _sum: { amount: true } }),
      database.unlockedAchievement.findMany({ select: { id: true } }),
    ]);
    const ids = new Set(unlocked.map(row => row.id));
    await context.route("**/api/**", async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() !== "GET") return route.fulfill({ status: 409, json: { error: "Read-only design verification" } });
      if (path === "/api/focus-points") return route.fulfill({ json: { points: Math.max(0, (study._sum.durationMinutes || 0) + (adjustments._sum.amount || 0)) } });
      if (path === "/api/achievements") return route.fulfill({ json: { achievements: ACHIEVEMENTS.map(({ id, title, description, tier, category }) => ({ id, title, description, tier, category, unlocked: ids.has(id) })), trophies: trophyCounts(ids) } });
      if (path === "/api/social") return route.fulfill({ json: { budgetSeconds: 900, usedSeconds: 0, remainingSeconds: 900, active: null } });
      return route.continue();
    });

    await page.goto(origin + "/login", { waitUntil: "networkidle" });
    await page.locator(".k-artwork-image").first().evaluate(image => image.decode());
    await page.screenshot({ path: resolve(outputDir, "login-desktop.png"), fullPage: true });
    const cookie = await sealData({ loggedIn: true }, { password: secret });
    await context.addCookies([{ name: "life_app_session", value: cookie, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
    const routes = process.argv.includes("--interactions-only") ? [] : ["/", "/schedule", "/habits", "/goals", "/topics", "/focus", "/minigames", "/social", "/trophies", "/focus-points", "/analytics", "/minigames/snake", "/minigames/chess"];
    const results = [];
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      for (const path of routes) {
        const response = await page.goto(origin + path, { waitUntil: "networkidle" });
        await page.locator("h1").first().waitFor();
        await page.waitForTimeout(1100);
        if (["/trophies", "/focus-points", "/minigames", "/schedule"].includes(path)) {
          results.push({ route: path, semanticEmblem: await page.locator(".chapter-emblem").count() === 1, noLetterRings: await page.locator(".section-scene .scene-object > b").count() === 0 });
        }
        if (path === "/") results.push({ sculpturalBrand: await page.locator(".nav-brand-row .sculptural-brand img").count() === 1, nameRemoved: !/karthik/i.test(await page.locator(".studio-brand, .nav-profile, .studio-footer").allTextContents().then(parts => parts.join(" "))) });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        const name = path === "/" ? "dashboard" : path.slice(1).replaceAll("/", "-");
        await page.screenshot({ path: resolve(outputDir, name + "-" + (width === 390 ? "mobile" : "desktop") + ".png"), fullPage: true });
        results.push({ route: path, width, status: response.status(), overflow, heading: await page.locator("h1").first().innerText() });
      }
    }
    await page.goto(origin + "/habits", { waitUntil: "networkidle" });
    for (const label of ["Journal", "Movies", "Web Series", "Games"]) {
      const button = page.getByRole("button", { name: label, exact: true });
      if (await button.count()) { await button.click(); await page.waitForLoadState("networkidle"); results.push({ tab: label, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1) }); }
    }
    await page.goto(origin + "/schedule?tab=tasks", { waitUntil: "networkidle" });
    results.push({ tab: "Tasks", found: await page.getByRole("button", { name: "Add task", exact: true }).count() === 1 });
    await page.goto(origin + "/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    results.push({ mobileNavigation: await page.getByRole("link", { name: "Completed Topics", exact: true }).isVisible() });
    await page.getByRole("button", { name: "Close navigation", exact: true }).click();
    results.push({ darkTheme: await page.locator("html").getAttribute("data-theme") === "dark" });
    await page.screenshot({ path: resolve(outputDir, "dashboard-dark-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "Switch to light theme", exact: true }).click();
    results.push({ lightTheme: await page.locator("html").getAttribute("data-theme") === "light" });
    await page.screenshot({ path: resolve(outputDir, "dashboard-light-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.screenshot({ path: resolve(outputDir, "dashboard-light-desktop.png"), fullPage: true });
    await page.reload({ waitUntil: "networkidle" });
    results.push({ themePersistence: await page.locator("html").getAttribute("data-theme") === "light" });
    await page.getByRole("button", { name: "Switch to dark theme", exact: true }).click();
    await page.getByRole("button", { name: "Motion on", exact: true }).click();
    await page.reload({ waitUntil: "networkidle" });
    results.push({ motionPaused: await page.locator("html").getAttribute("data-motion") === "off", motionPersisted: await page.getByRole("button", { name: "Motion paused", exact: true }).count() === 1 });
    await page.getByRole("button", { name: "Motion paused", exact: true }).click();
    await page.goto(origin + "/focus", { waitUntil: "networkidle" });
    const beforeZoom = await page.locator(".k-artwork").evaluate(element => getComputedStyle(element).transform);
    await page.waitForTimeout(600);
    results.push({ sculpturalKMotion: await page.locator(".k-artwork").evaluate(element => getComputedStyle(element).transform) !== beforeZoom });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    results.push({ reducedMotionFallback: await page.locator(".k-artwork").count() > 0 && await page.locator(".sculpture canvas").count() === 0 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    // Timer mutations below are browser fixtures, never real study-history writes.
    let fixture = null, mutationCount = 0, failStop = false;
    await page.route(/\/api\/timer(?:\/|$)/, async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === "GET") return route.fulfill({ json: path.endsWith("/active") ? fixture : [] });
      mutationCount++;
      if (path.endsWith("/start")) {
        fixture = { id: "browser-fixture", subject: request.postDataJSON().subject, startTime: new Date().toISOString(), endTime: null, durationMinutes: null, notes: null };
        return route.fulfill({ status: 201, json: fixture });
      }
      if (path.endsWith("/stop")) {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (failStop) return route.fulfill({ status: 500, json: { error: "Simulated failed stop" } });
        fixture = null;
        return route.fulfill({ json: { ok: true } });
      }
      fixture = null;
      return route.fulfill({ json: { ok: true } });
    });
    await page.evaluate(() => { localStorage.setItem("timer-plan-state", JSON.stringify({ blockIndex: 0, phase: "focus", phaseEndsAt: Date.now() + 60000 })); });
    await page.goto(origin + "/focus", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Begin your session", exact: true }).waitFor();
    results.push({ detachedPlanDoesNotRestart: mutationCount === 0 });
    await page.screenshot({ path: resolve(outputDir, "focus-idle-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: /Free flow/ }).click();
    await page.getByRole("button", { name: "Begin your session", exact: true }).click();
    await page.getByRole("button", { name: "Stop & save", exact: true }).waitFor();
    console.log("Timer test: free session started");
    failStop = true;
    await page.getByRole("button", { name: "Stop & save", exact: true }).click();
    await page.locator(".focus-console [role=alert]").waitFor();
    await page.getByRole("button", { name: "Stop & save", exact: true }).waitFor();
    results.push({ failedStopKeepsSession: await page.getByRole("button", { name: "Stop & save", exact: true }).isVisible() });
    console.log("Timer test: failed stop state", await page.locator(".focus-console").innerText());
    failStop = false;
    await page.getByRole("button", { name: "Stop & save", exact: true }).click();
    await page.getByRole("button", { name: "Begin your session", exact: true }).waitFor();
    console.log("Timer test: successful free stop");
    await page.getByRole("button", { name: /^Classic/ }).click();
    await page.getByRole("button", { name: "Begin your session", exact: true }).click();
    await page.getByRole("button", { name: "End plan", exact: true }).click();
    await page.getByRole("button", { name: /Begin your session|Resume session/ }).waitFor();
    results.push({ endPlanWaitsForStop: fixture === null, planCleared: await page.evaluate(() => localStorage.getItem("timer-plan-state") === null) });
    await page.goto(origin + "/", { waitUntil: "networkidle" });
    await page.locator(".focus-dial strong").filter({ hasText: "READY" }).waitFor();
    results.push({ overviewRefreshesStoppedSession: true });
    await page.goto(origin + "/schedule", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "agenda", exact: true }).click();
    results.push({ agendaView: await page.locator(".agenda-view").count() === 1 });
    await page.goto(origin + "/minigames", { waitUntil: "networkidle" });
    await page.getByLabel("Search challenges").fill("no-matching-challenge-123");
    results.push({ gameSearch: await page.locator(".arcade-card").count() === 0 });
    await page.getByLabel("Search challenges").fill("");
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin + "/", { waitUntil: "networkidle" });
      results.push({ route: "/", width, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1) });
    }
    console.log(JSON.stringify({ results, errors, screenshots: outputDir }, null, 2));
    if (errors.length || results.some(result => result.overflow || (result.status && result.status !== 200) || Object.entries(result).some(([key, value]) => key !== "overflow" && value === false))) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await database.$disconnect();
    server.kill();
  }
}
