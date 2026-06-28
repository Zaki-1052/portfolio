# Terminal Mail Contact Form

**Date:** 2026-06-28

## What was done

Added a `$ mail zara` contact form to the expression section. The form opens as a terminal-styled popup with blue holographic coloring (matching the toolkit popup aesthetic), submits via Formspree, and includes validation, rate limiting, focus trapping, and a progress bar animation.

### New files
- `content/form.json` — Formspree endpoint (`xzzblaeb`), recipient display, rate limit config
- `src/hooks/useTerminalMail.ts` — state machine hook (composing/sending/success/error), field validation, Formspree FormData submission, localStorage rate limiting (5/day)
- `src/scales/expression/TerminalMail.tsx` — modal component with `$ mail zara` header, To/Name/From/Subject/Body fields, honeypot spam protection, `$ send` button with progress bar, focus trapping, Escape/Cmd+Enter keyboard shortcuts

### Modified files
- `src/content/types.ts` — added `FormConfig` interface
- `src/content/loader.ts` — added `getFormConfig()` importing `form.json`
- `src/scales/expression/ExpressionContent.tsx` — added `$ mail zara` trigger button below contact links, renders `<TerminalMail>` conditionally
- `src/styles/globals.css` — added `.mail-trigger` and `.terminal-mail-*` CSS block (~200 lines): blue holographic scan-line texture, square corners, input/textarea/button styling, progress bar animation, reduced-motion overrides
- `docs/SPEC-portfolio.md` — added `TerminalMail.tsx`, `useTerminalMail.ts`, `form.json` to project structure; updated expression scale description
- `docs/PLAN-portfolio.md` — added terminal mail to Phase 1.8 deliverables and done criteria

## Decisions made
- **Formspree over reCAPTCHA**: Dropped reCAPTCHA (widget breaks terminal aesthetic). Using Formspree's built-in spam protection + honeypot field. reCAPTCHA can be re-enabled in Formspree dashboard if spam becomes an issue. Had to disable CAPTCHA in Formspree dashboard for submissions to work.
- **FormData not JSON**: Formspree requires `FormData` with `Accept: application/json` header, not `Content-Type: application/json`. Matched old portfolio's submission pattern.
- **Blue holographic, not green**: Initially built with green (`--aod-green`) to match the code/expression scale accent. User preferred blue (`--aod-blue`) to match the established holographic UI-element language. Swapped all color references.
- **4 fields**: Name, From (email), Subject, Body. Added Name field (user preference) beyond the minimal terminal `mail` metaphor of just email/subject/body.
- **`<button>` trigger, not `<a>`**: The `$ mail zara` row uses a button element since it opens a dialog, not a navigation.
- **Fake progress bar**: Formspree responds in <1s, so the progress bar races to ~80% via CSS animation, holds until the real response, then fills to 100% on success. A `Promise.all` with 1.2s minimum delay prevents it from feeling instant.
- **Endpoint `xzzblaeb`**: Corrected from `xzzpddge` (which was in old.js) to `xzzblaeb` (the actual active endpoint from the old portfolio's HTML form action).

## Verified
- TypeScript typecheck: clean
- Production build: passes
- Form opens via `$ mail zara` trigger, fields fill correctly
- Escape key closes popup, focus returns to trigger
- Error state renders with red progress bar + retry/close buttons
- Formspree submission works (confirmed by user after disabling CAPTCHA)

## Key file paths
- `content/form.json` — Formspree config
- `src/hooks/useTerminalMail.ts` — form logic hook
- `src/scales/expression/TerminalMail.tsx` — popup component
- `src/scales/expression/ExpressionContent.tsx` — trigger integration
- `src/styles/globals.css` — terminal mail CSS (appended at end)
