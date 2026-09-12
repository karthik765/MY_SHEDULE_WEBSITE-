# design-sync notes for this repo

- This repo is a Next.js **app**, not a publishable component library — no `dist/`, no `main`/`module`/`exports` in `package.json`. The converter runs in synth-from-`src/` mode (`[NO_DIST]` is expected on every build, not an error).
- `srcDir` is pinned to `src/components` (not the default `src/`) — the App Router tree under `src/app/**` (pages, layouts, API routes) is excluded on purpose. Those aren't reusable components, and `src/app/layout.tsx` importing `./globals.css` was dragging Tailwind's unresolved `@import "tailwindcss"` into the JS bundle, which esbuild can't resolve on its own.
- **Tailwind v4 CSS**: `@import "tailwindcss"` in `src/app/globals.css` only expands into real utility CSS through the actual Next.js/Tailwind build pipeline — esbuild's plain CSS bundler can't process it. `cssEntry` points at `.design-sync/compiled-globals.css`, a **manual snapshot** of the real compiled CSS chunk from `next build` (`.next/static/chunks/*.css` — the filename is content-hashed and changes every build).
  - **To regenerate this snapshot** (needed whenever Tailwind classes used across the app change, or the "comic" theme tokens in `globals.css` change): run `npm run build` (it will fail later at "Collecting page data" over a missing `SESSION_SECRET` env var — that's fine, ignore it, the CSS is already emitted by then), find the new hashed file under `.next/static/chunks/*.css`, and `cp` it over `.design-sync/compiled-globals.css`.
- The `npm run build` failure itself (`SESSION_SECRET env var must be set`) is unrelated to design-sync — it's this app's own auth session setup, not something design-sync needs fixed. Don't chase it.

## Re-sync risks

- `.design-sync/compiled-globals.css` is a **snapshot, not live-generated** — it will silently drift from the real app if new Tailwind utility classes get used, or CSS variables in `globals.css` change, without anyone re-running the regeneration steps above. A re-sync does NOT auto-detect this drift.
- Component discovery relies entirely on `deriveComponentsFromSrc`'s heuristic (PascalCase value exports under `src/components/`) since there's no `.d.ts` — a non-component PascalCase export (e.g. a types/logic helper file) could get swept in; check the component count sanity against a fresh `Glob` of `src/components/**/*.tsx` on future syncs.
- The synthesized `.d.ts`/prop contracts are weaker than a real library build would produce (no dist, no shipped types) — flagged per the skill's own expectations for this shape.
