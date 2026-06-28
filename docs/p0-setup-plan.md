# Phase 0: Scaffolding Plan

## Context

This is the first build phase of the "Biological Scale Descent Portfolio" — a scroll-driven 3D portfolio site (React + R3F + GSAP + Lenis). Three planning sessions have locked the architecture, design system, and content structure (see `docs/SPEC-portfolio.md`, `docs/DESIGN-portfolio.md`, `docs/PLAN-portfolio.md`).

Phase 0 produces: a running Vite dev server, configured toolchain, empty Canvas behind 6 scrollable colored sections, Zustand depth store (not wired to scroll yet), all linting/formatting passing, and CI. No 3D content, no scroll animations, no real content — just the skeleton.

The project root already contains `docs/` (planning docs) and `reference/` (design tokens, prototype, fonts). We scaffold the Vite project **at this root**, alongside those directories.

## Critical Corrections to PLAN-portfolio.md

Research revealed several version and config mismatches that must be corrected:

| Item | Plan says | Corrected | Why |
|---|---|---|---|
| `@react-three/fiber` | `^8.17.0` | `^9.6.0` | **v9 required for React 19** (v8 is React 18 only) |
| `@react-three/drei` | `^9.114.0` | `^10.7.0` | v10 is the current stable line |
| `@react-three/postprocessing` | `^2.16.0` | `^3.0.0` | **v3 required for React 19** (v2 dropped) |
| `lenis` | `^1.1.0` | `^1.3.0` | Bumped; latest stable is 1.3.25 |
| Tailwind config | `tailwind.config.ts` | **CSS-first (no config file)** | Tailwind v4 configures via `@import "tailwindcss"` in CSS |
| ESLint config | `.eslintrc` | `eslint.config.mjs` (flat config) | ESLint v9 dropped `.eslintrc` entirely |
| tsconfig | single file | 3 files (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`) | Vite 6 template pattern |

## Implementation Steps

### 0.1 — Project initialization

**Create `package.json`** at root manually (not via `npm create vite` to avoid conflicts with existing `docs/`, `reference/`, `CLAUDE.md`).

Set `"name": "zalibhai-portfolio"`, `"type": "module"`, scripts:
- `"dev": "vite"`
- `"build": "tsc -b && vite build"`
- `"preview": "vite preview"`
- `"lint": "eslint ."`
- `"format": "prettier --write ."`
- `"typecheck": "tsc --noEmit"`

**Install production deps** (corrected versions):
```
react@^19.0.0  react-dom@^19.0.0
three@~0.170.0  @react-three/fiber@^9.6.0  @react-three/drei@^10.7.0
@react-three/postprocessing@^3.0.0
gsap@^3.12.5  lenis@^1.3.0  zustand@^5.0.0
react-markdown@^9.0.0  remark-gfm@^4.0.0
```

**Install Tailwind:**
```
tailwindcss@^4.0.0  @tailwindcss/vite@^4.0.0
```

**Install dev deps:**
```
typescript@^5.6.0  @vitejs/plugin-react@^4.3.0
@types/react@^19.0.0  @types/react-dom@^19.0.0  @types/three@~0.170.0
@theatre/core@^0.7.0  @theatre/studio@^0.7.0  @theatre/r3f@^0.7.0
leva@^0.9.35  r3f-perf@^7.2.0
eslint@^9.0.0  @eslint/js@^9.0.0  typescript-eslint@^8.0.0
eslint-plugin-react-hooks@^5.0.0  eslint-plugin-react-refresh@^0.4.0
eslint-config-prettier@^9.1.0
prettier@^3.4.0
husky@^9.0.0  lint-staged@^15.2.0
vite-plugin-compression@^0.5.1
vitest@^2.0.0
```

After install, verify `package-lock.json` resolved correctly. Theatre.js may emit React 19 peer dep warnings — accept them (dev-only tool, will test at Phase 3).

### 0.2 — Configuration files

**`vite.config.ts`:**
- Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`, conditional `vite-plugin-compression` (build only)
- Resolve alias: `@/` → `./src/`
- Assemble raw markdown import: `assetsInclude: ['**/*.md']` (or use `?raw` suffix)
- Env prefix: `VITE_`

**`tsconfig.json`** (project references root):
```json
{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }] }
```

**`tsconfig.app.json`:**
- `strict: true`, `target: "ES2020"`, `module: "ESNext"`, `jsx: "react-jsx"`
- `paths: { "@/*": ["./src/*"] }`
- `include: ["src"]`

**`tsconfig.node.json`:**
- For vite.config.ts and other Node-side files
- `include: ["vite.config.ts"]`

**`eslint.config.mjs`** (ESLint v9 flat config):
- Base: `@eslint/js` recommended
- TypeScript: `typescript-eslint` recommended
- React hooks + refresh plugins
- Prettier: `eslint-config-prettier` to disable conflicting rules
- Ignores: `dist/`, `node_modules/`, `reference/`, `docs/`, `theatre/`

**`.prettierrc`:**
- `singleQuote: true`, `semi: true`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`

**`.prettierignore`:**
- `dist/`, `node_modules/`, `reference/`, `docs/`, `*.md`

**Husky + lint-staged:**
- `npx husky init` → creates `.husky/` directory
- `.husky/pre-commit`: runs `npx lint-staged`
- `lint-staged` config in `package.json`:
  ```json
  { "*.{ts,tsx}": ["eslint --fix", "prettier --write"], "*.{css,json}": ["prettier --write"] }
  ```

### 0.3 — CSS foundation

**Copy fonts** from `reference/assets/fonts/` → `public/fonts/`:
- `Lora-VariableFont_wght.ttf`
- `FiraCode-VariableFont_wght.ttf`
- Download Inter variable font (woff2 from Google Fonts) → `public/fonts/Inter-VariableFont.woff2`

(TTF→woff2 conversion is a Phase 7 optimization. TTF works fine in dev.)

**Create `src/styles/globals.css`:**
1. `@import "tailwindcss";` (Tailwind v4 CSS-first)
2. `@font-face` declarations for Lora, Inter, Fira Code (variable fonts)
3. Port all CSS custom properties from reference token files:
   - Colors from `reference/tokens/colors.css` (Atom One Dark palette, semantic surfaces, per-scale overrides)
   - Typography from `reference/tokens/typography.css` (font stacks, modular scale, line heights, tracking, weights)
   - Spacing from `reference/tokens/spacing.css` (4px base, section rhythm, radii, borders, shadows, motion, z-index)
4. Per-scale `[data-scale="..."]` overrides (all 6 scales)
5. `prefers-reduced-motion` media query (zero all durations)
6. Base styles: `html` dark bg, smooth scrolling, font stacks, `body` margin reset

### 0.4 — App shell

**Create `index.html`** at root:
- Standard Vite entry: `<div id="root">`, `<script type="module" src="/src/main.tsx">`
- `<html lang="en">`, proper `<head>` with charset, viewport meta
- Minimal `<title>` and `<meta name="description">`

**Create `src/vite-env.d.ts`:**
- `/// <reference types="vite/client" />`

**Create `src/main.tsx`:**
- Mount `<App />` into `#root` via `createRoot`
- Import `./styles/globals.css`

**Create `src/app.tsx`:**
- Fixed `<Canvas>` with: empty scene, dark clear color (`#282c34`), `frameloop="demand"`, `dpr={[1, 2]}`, perspective camera
- `<main>` element wrapping 6 `<section>` elements
- Each section: `id` matching scale name (`tissue`, `cellular`, `chromatin`, `protein`, `code`, `expression`), `min-height: 100vh`, `data-scale` attribute, distinct placeholder background color from the per-scale `--bg` variable
- Placeholder `<h2>` in each section with the scale name (real headings, lorem body per content constraint)
- Canvas is positioned `fixed` behind content (z-index: -1), sections scroll over it

### 0.5 — Zustand depth store

**Create `src/stores/depth.ts`:**
- `DepthStore` interface: `depth: number` (0–1), `setDepth(d: number)`, `currentScale` (derived)
- Scale names type: `'tissue' | 'cellular' | 'chromatin' | 'protein' | 'code' | 'expression'`
- Scale boundaries: `[0, 0.17, 0.33, 0.50, 0.67, 0.83, 1.0]`
- `currentScale` computed from `depth` on every `setDepth` call
- Not wired to scroll yet — that's Phase 2

### 0.6 — Directory stubs

Create the directory structure with `.gitkeep` files where needed. Only directories that Phase 1+ will immediately use:

```
src/
├── components/
├── content/
├── engine/
├── hooks/
├── scales/
│   ├── tissue/
│   ├── cellular/
│   ├── chromatin/
│   ├── protein/
│   ├── code/
│   └── expression/
├── shaders/
└── utils/
content/           (project root, for markdown/JSON content files)
├── sections/
public/
├── fonts/
```

### 0.7 — CI and git config

**Create `.github/workflows/ci.yml`:**
- Trigger: push to `main`, pull requests
- Node 20, `npm ci`
- Steps: `npm run typecheck`, `npm run lint`, `npm run build`

**Create/update `.gitignore`:**
- `node_modules/`, `dist/`, `.env*`, `theatre/`, `*.local`, `.DS_Store`

**Update `CLAUDE.md`** at project root with project-specific instructions (stack, dev commands, key paths).

### 0.8 — Verify

Run these checks to confirm Phase 0 is complete:
1. `npm run dev` — Vite dev server starts, hot reload works
2. Browser: 6 colored sections scroll, each with distinct background color shifting warm→cool
3. Browser: Canvas renders behind sections (dark, empty)
4. `npm run build` — production build succeeds with no errors
5. `npm run typecheck` — `tsc --noEmit` passes
6. `npm run lint` — ESLint passes
7. Commit triggers pre-commit hook (lint-staged runs)

### Files created (complete list)

```
package.json
vite.config.ts
tsconfig.json
tsconfig.app.json
tsconfig.node.json
eslint.config.mjs
.prettierrc
.prettierignore
.gitignore
index.html
src/main.tsx
src/app.tsx
src/vite-env.d.ts
src/stores/depth.ts
src/styles/globals.css
public/fonts/Lora-VariableFont_wght.ttf      (copied from reference/)
public/fonts/FiraCode-VariableFont_wght.ttf   (copied from reference/)
public/fonts/Inter-VariableFont.woff2         (downloaded)
.github/workflows/ci.yml
.husky/pre-commit
CLAUDE.md                                     (updated)
```

### Key reference files to reuse

| Source | Use |
|---|---|
| `reference/tokens/colors.css` | Port verbatim into globals.css `:root` and `[data-scale]` blocks |
| `reference/tokens/typography.css` | Port font stacks, type scale, per-scale heading font overrides |
| `reference/tokens/spacing.css` | Port spacing scale, radii, borders, shadows, motion, z-index |
| `reference/assets/fonts/` | Copy Lora and Fira Code .ttf files to `public/fonts/` |

---

Phase 0 is complete. Here's what was done:

**Created (22 files):**
- `package.json`, `vite.config.ts`, `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`
- `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore`
- `index.html`, `src/main.tsx`, `src/app.tsx`, `src/vite-env.d.ts`
- `src/stores/depth.ts` — Zustand depth store with scale boundaries
- `src/styles/globals.css` — full design token system (colors, typography, spacing, per-scale overrides)
- `.github/workflows/ci.yml`, `.husky/pre-commit`
- `CLAUDE.md` updated with project-specific instructions
- 3 font files in `public/fonts/`, directory stubs for all future phases

**All checks passing:**
- `npm run typecheck` — clean
- `npm run lint` — clean  
- `npm run build` — succeeds (1.05 MB bundle, expected with Three.js)
- `npm run dev` — 6 colored sections scrollable, Canvas behind them

**Next:** Phase 1 — HTML content layer and content pipeline.