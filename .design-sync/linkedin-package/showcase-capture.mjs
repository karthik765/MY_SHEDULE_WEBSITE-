import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { chromium } = require("C:/Users/karth/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright");
const outputDir = path.resolve(".design-sync/linkedin-package");
const rawDir = path.join(outputDir, "raw");
await mkdir(rawDir, { recursive: true });

const origin = "http://127.0.0.1:3110";
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", "3110"], {
  env: {
    ...process.env,
    SESSION_SECRET: randomBytes(32).toString("hex"),
    ADMIN_EMAIL: "showcase-preview",
    LOCAL_PREVIEW_EMAIL_ONLY: "1",
  },
  stdio: "ignore",
  windowsHide: true,
});
const stopped = once(server, "exit");

const today = new Date();
const iso = date => date.toISOString();
const day = offset => {
  const value = new Date(today);
  value.setDate(value.getDate() + offset);
  return iso(value);
};
const sampleEvents = [
  { id: "show-1", title: "Deep work", date: day(0), startTime: "09:00", endTime: "10:30", recurring: "daily", weekday: null, notes: null },
  { id: "show-2", title: "Build and review", date: day(0), startTime: "14:00", endTime: "15:00", recurring: "daily", weekday: null, notes: null },
];
const sampleHabits = [
  { id: "habit-1", name: "Read and reflect", frequency: "daily", logs: [-1, -2, -3, -4].map((offset, index) => ({ id: `log-${index}`, date: day(offset), completed: true })) },
  { id: "habit-2", name: "Move for 30 minutes", frequency: "daily", logs: [-1, -3, -5].map((offset, index) => ({ id: `move-${index}`, date: day(offset), completed: true })) },
];

const browser = await chromium.launch({ headless: true });
let context;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { ready = (await fetch(origin + "/login")).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Showcase server started");

  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
    colorScheme: "dark",
  });
  // Hide account-specific detail before each document paints. The showcase
  // keeps aggregate visuals but never records task, goal, or habit labels.
  await context.addInitScript(() => {
    const injectPrivacyStyle = () => {
      if (!document.documentElement) return false;
      const style = document.createElement("style");
      style.textContent = ".dashboard-grid,.dashboard-secondary,.studio-break{visibility:hidden!important}.recharts-wrapper text{opacity:0!important}";
      document.documentElement.appendChild(style);
      return true;
    };
    if (!injectPrivacyStyle()) {
      const observer = new MutationObserver(() => {
        if (injectPrivacyStyle()) observer.disconnect();
      });
      observer.observe(document, { childList: true });
    }
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.route("**/api/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/login") return route.continue();
    if (request.method() !== "GET") return route.fulfill({ status: 409, json: { error: "Showcase capture is read-only" } });
    let json = null;
    if (url.pathname === "/api/focus-points") json = { points: 1480 };
    else if (url.pathname === "/api/achievements") json = { achievements: [], trophies: { bronze: 4, silver: 2, gold: 1, platinum: false } };
    else if (url.pathname === "/api/schedule") json = sampleEvents;
    else if (url.pathname === "/api/tasks") json = [
      { id: "task-1", title: "Shape the next idea", notes: null, dueDate: day(1), priority: "high", category: "weekly", completed: false },
      { id: "task-2", title: "Review weekly progress", notes: null, dueDate: day(3), priority: "medium", category: "monthly", completed: false },
    ];
    else if (url.pathname === "/api/habits") json = sampleHabits;
    else if (url.pathname === "/api/topics") json = [];
    else if (url.pathname === "/api/timer") json = [];
    else if (url.pathname === "/api/timer/active") json = null;
    else if (url.pathname === "/api/journal" || url.pathname === "/api/media") json = [];
    else if (url.pathname === "/api/social") json = { active: null, usedSeconds: 0, allowanceSeconds: 1800, remainingSeconds: 1800 };
    else if (url.pathname === "/api/games/limits") json = { weeklyCap: 180, weeklyUsed: 42, weeklyRemaining: 138, minigameWeeklyCap: 90, minigameWeeklyUsed: 24, minigameWeeklyRemaining: 66, pointsEarnedThisWeek: 175, maxEarnableThisWeek: 600, gamesPlayedThisWeek: 7, timesFailedThisWeek: 1 };
    else if (url.pathname === "/api/games/tab-stats") json = [];
    else if (url.pathname === "/api/games/unlocks") json = {};
    else if (url.pathname === "/api/games") json = [];
    return route.fulfill({ status: 200, json });
  });

  const style = `
    .launch-caption{position:fixed;z-index:1000;left:48px;bottom:42px;padding:14px 18px;border-left:3px solid #f7932c;background:rgba(5,7,6,.78);backdrop-filter:blur(14px);color:#f4f0e7;font:600 24px/1.1 'Arial Narrow',sans-serif;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 20px 60px #0008;animation:launchIn .55s cubic-bezier(.2,.9,.3,1) both}.launch-caption small{display:block;margin-top:7px;color:#d3a56d;font:11px monospace;letter-spacing:.16em}.launch-card{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;text-align:center;background:radial-gradient(circle at 50% 48%,#8d441c55,transparent 34%),rgba(5,7,6,.96);color:#f4f0e7;opacity:0;transition:opacity .45s}.launch-card.is-on{opacity:1}.launch-card h2{font:600 96px/.9 'Arial Narrow',sans-serif;letter-spacing:-.02em;text-transform:uppercase}.launch-card h2 span{color:#f7932c}.launch-card p{margin-top:24px;font:13px monospace;letter-spacing:.22em;color:#b4ab9c;text-transform:uppercase}@keyframes launchIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}`;
  const decorate = async () => {
    await page.addStyleTag({ content: style });
    await page.evaluate(() => {
      const sensitive = document.querySelectorAll(".dashboard-grid,.dashboard-secondary,.studio-break");
      sensitive.forEach(node => node.setAttribute("data-showcase-hidden", "true"));
      const el = document.createElement("style");
      el.textContent = '[data-showcase-hidden="true"]{visibility:hidden!important}';
      document.head.appendChild(el);
    });
  };
  const caption = async (title, subtitle) => {
    await page.locator(".launch-caption").evaluateAll(nodes => nodes.forEach(node => node.remove()));
    await page.evaluate(({ title, subtitle }) => {
      const node = document.createElement("div");
      node.className = "launch-caption";
      node.innerHTML = `${title}<small>${subtitle}</small>`;
      document.body.appendChild(node);
    }, { title, subtitle });
  };
  const card = async (title, accent, subtitle, ms) => {
    await page.evaluate(({ title, accent, subtitle }) => {
      const node = document.createElement("div");
      node.className = "launch-card";
      node.innerHTML = `<div><h2>${title}<br><span>${accent}</span></h2><p>${subtitle}</p></div>`;
      document.body.appendChild(node);
      requestAnimationFrame(() => node.classList.add("is-on"));
    }, { title, accent, subtitle });
    await page.waitForTimeout(ms - 450);
    await page.locator(".launch-card").evaluate(node => node.classList.remove("is-on"));
    await page.waitForTimeout(450);
    await page.locator(".launch-card").evaluate(node => node.remove());
  };
  const goto = async route => {
    await page.goto(origin + route, { waitUntil: "networkidle" });
    await decorate();
  };
  const glide = async (x, y, ms = 700) => {
    await page.mouse.move(x, y, { steps: 24 });
    await page.waitForTimeout(ms);
  };

  await goto("/login");
  await card("MAKE TIME.", "MAKE IT COUNT.", "A personal productivity studio / Beta", 3000);
  await caption("Built around attention", "Private workspace + public demo");
  await glide(1450, 850, 1000);
  await page.waitForTimeout(1100);

  await page.getByRole("link", { name: /Explore Demo/i }).click();
  await page.waitForLoadState("networkidle");
  await decorate();
  await caption("Explore safely", "Public demo / zero personal data");
  await glide(980, 500, 2100);

  await page.getByRole("button", { name: /Switch to light theme/i }).click();
  await caption("One studio. Two moods.", "Warm ivory / sculptural light mode");
  await glide(1200, 590, 1900);

  await page.getByRole("button", { name: /Switch to dark theme/i }).click();
  await caption("Back to the atmosphere", "Obsidian dark mode / primary experience");
  await glide(1450, 430, 900);

  await page.getByRole("link", { name: "Focus", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await decorate();
  await caption("Protect the signal", "Focus modes / animated orbit");
  await page.getByRole("button", { name: "Free", exact: true }).click();
  await glide(1450, 420, 2200);

  await page.getByRole("link", { name: "Schedule", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await decorate();
  await caption("See the whole system", "Schedule / tasks / habits / learning");
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await glide(1050, 600, 1600);

  await card("THE DEMO SHOWS IT.", "YOUR SPACE LIVES IT.", "Signed-in workspace / real feature system", 1900);
  await goto("/login");
  await page.getByRole("button", { name: /Enter your space/i }).click();
  await page.waitForURL(origin + "/");
  await page.waitForLoadState("networkidle");
  await decorate();
  await caption("Your command center", "Overview / focus / tasks / streaks");
  await glide(1080, 520, 2700);

  await page.getByRole("link", { name: "Focus", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await decorate();
  await caption("Enter your element", "Classic / free flow / parallel");
  await glide(980, 700, 2700);

  await page.getByRole("link", { name: "Schedule", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await decorate();
  await caption("Own your day", "A week with room to breathe");
  await glide(1100, 690, 2200);

  await page.getByRole("link", { name: "Habits", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await decorate();
  await caption("Build your ritual", "Habits / journal / watchlists");
  await page.getByRole("tab", { name: "Journal", exact: true }).click();
  await glide(900, 680, 1800);

  await page.getByRole("link", { name: "Learning", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await decorate();
  await caption("Follow your curiosity", "A visual knowledge atlas");
  await glide(1320, 470, 1450);

  await goto("/minigames");
  await caption("Reset with intention", "Puzzles / IQ / physics / rewards");
  await page.getByRole("tab", { name: /IQ/i }).click();
  await glide(1000, 700, 1800);

  await goto("/analytics");
  await caption("Momentum, made visible", "Analytics / progress / reflection");
  await glide(1150, 570, 1350);

  await card("BUILT TO FOCUS.", "DESIGNED TO MOVE.", "karthiklifehq.site / Public beta", 2000);
  await page.waitForTimeout(2500);
  assert.deepEqual(errors, [], `No browser errors: ${errors.join(" | ")}`);

  await page.close();
  await context.close();
  const recorded = await video.path();
  await writeFile(path.join(outputDir, "raw-video-path.txt"), recorded, "utf8");
  console.log(recorded);
} finally {
  if (context) await context.close().catch(() => {});
  await browser.close();
  server.kill();
  await stopped;
}
