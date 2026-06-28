# Phase 0: Scaffolding

**Date:** 2026-06-27

## What was done

- Scaffolded Vite 6 + React 19 + TypeScript project at repo root (alongside existing `docs/` and `reference/`)
- Installed all production and dev dependencies with corrected/bumped versions
- Created full configuration: `vite.config.ts`, 3 tsconfig files, `eslint.config.mjs` (flat config), `.prettierrc`, `.prettierignore`, `.gitignore`
- Set up husky + lint-staged pre-commit hooks
- Copied Lora and Fira Code fonts from `reference/assets/fonts/`, downloaded Inter variable woff2
- Created `src/styles/globals.css` with complete design token system ported from `reference/tokens/` (colors, typography, spacing, per-scale overrides, reduced-motion support)
- Created app shell: `index.html`, `src/main.tsx`, `src/app.tsx` with fixed Canvas + 6 scrollable scale sections
- Created `src/stores/depth.ts` — Zustand store with scale boundaries and `currentScale` derivation
- Created `src/vite-env.d.ts`
- Created directory stubs with `.gitkeep` for all future phase directories
- Created `.github/workflows/ci.yml` (typecheck, lint, build on push/PR)
- Updated `CLAUDE.md` with project-specific instructions

## Decisions made

- **R3F v9** (not v8 as original plan stated) — required for React 19 compatibility
- **drei v10**, **postprocessing v3** — same React 19 requirement
- **Tailwind v4 CSS-first config** — no `tailwind.config.ts`, configuration via `@import "tailwindcss"` in CSS
- **ESLint v9 flat config** — `eslint.config.mjs` instead of `.eslintrc`
- **Scaffold at root** — not in a `zalibhai.com/` subdirectory, to keep git history clean
- **Theatre.js installed with `--legacy-peer-deps`** — has R3F v8 peer dep, accepted warnings since dev-only
- **Lenis bumped to ^1.3.0** from ^1.1.0
- **`@types/node` added** — needed for `path` and `__dirname` in vite.config.ts
- **`vite` added as explicit dev dep** — was missing, caused `tsc -b` build failure

## Open items

- Bundle size warning (1 MB chunk from Three.js) — code-splitting deferred to later phase
- Font files are .ttf — woff2 conversion is a Phase 7 optimization
- Theatre.js runtime compatibility with React 19 untested — will validate in Phase 3
- npm audit shows 4 vulnerabilities (from transitive deps) — monitor but not blocking

## Key file paths

- `package.json` — all deps with corrected versions
- `vite.config.ts` — Vite config with React, Tailwind, path aliases
- `src/styles/globals.css` — complete design token system
- `src/app.tsx` — app shell with Canvas + 6 sections
- `src/stores/depth.ts` — Zustand depth store
- `eslint.config.mjs` — ESLint v9 flat config
- `.github/workflows/ci.yml` — CI pipeline
