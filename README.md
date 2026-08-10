# Life Dashboard

A personal website for schedule, tasks, a study/hours timer, habits, journal, and goals — all in one place.

## Stack

Next.js (App Router, TypeScript) + Tailwind + Prisma + SQLite (dev) / Postgres (prod) + iron-session for a single-user login + Recharts for analytics.

## Local development

1. Install dependencies: `npm install`
2. `.env` is already set up for local dev with SQLite. Generate your own login password hash:
   ```
   npm run hash-password -- "yourpassword"
   ```
   Paste the output into `.env` as `ADMIN_PASSWORD_HASH`. **Important:** bcrypt hashes contain `$` characters that Next.js's `.env` loader treats as variable references — escape every `$` as `\$` in the `.env` file (see the existing placeholder value for the format), or the hash will get silently corrupted and login will fail.
3. `npm run dev` and open http://localhost:3000. Log in with `ADMIN_USERNAME` / your password.

## Deploying (Vercel + Neon Postgres, both free tier)

1. **Database:** create a free Postgres project at [neon.tech](https://neon.tech), copy its connection string.
2. **Switch the schema to Postgres:** in `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"` under `datasource db`.
3. Push the schema to Neon: set `DATABASE_URL` to the Neon connection string locally (or in your shell) and run `npx prisma db push`.
4. **Deploy:** push this repo to GitHub, then import it at [vercel.com](https://vercel.com/new).
5. In the Vercel project's Environment Variables, set:
   - `DATABASE_URL` — the Neon connection string
   - `SESSION_SECRET` — a long random string (not the dev placeholder)
   - `ADMIN_USERNAME` — your chosen username
   - `ADMIN_PASSWORD_HASH` — output of `npm run hash-password -- "yourpassword"` (Vercel's env var UI does **not** expand `$`, so paste the hash as-is, unescaped, there)
6. Deploy. Visit the Vercel URL and log in.

## Project structure

- `src/app/*` — pages (one per feature) and `api/*` route handlers (CRUD per entity)
- `src/lib/` — Prisma client singleton, session config, and small date/streak helper functions shared between server and client components
- `src/middleware.ts` — gates every route except `/login` and `/api/login` behind the session cookie
- `prisma/schema.prisma` — data model for tasks, schedule events, study sessions, habits, journal entries, and goals
