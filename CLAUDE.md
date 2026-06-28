# Portfolio Project

Biological Scale Descent Portfolio — scroll-driven 3D site.

## Stack

React 19 + TypeScript, Vite 6, Three.js + R3F v9 + drei v10, GSAP + Lenis, Zustand, Tailwind CSS v4

## Commands

- `npm run dev` — start dev server
- `npm run build` — typecheck + production build
- `npm run typecheck` — TypeScript check only
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Key paths

- `src/` — application source
- `src/stores/depth.ts` — Zustand depth store (scroll position 0–1)
- `src/styles/globals.css` — all CSS custom properties and design tokens
- `content/` — markdown and JSON content files
- `reference/` — design prototype and token CSS (read-only reference)
- `docs/` — planning documents (SPEC, DESIGN, PLAN)

## Configuration notes

- **Tailwind v4**: CSS-first config — no tailwind.config file. All config in globals.css.
- **ESLint v9**: Flat config in `eslint.config.mjs` — no .eslintrc.
- **Path alias**: `@/` maps to `src/`
- **Theatre.js**: Dev-only, installed with `--legacy-peer-deps` due to R3F v8 peer dep.

## Architecture references

@docs/SPEC-portfolio.md
@docs/DESIGN-portfolio.md
@docs/PLAN-portfolio.md
