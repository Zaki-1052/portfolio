Quiet call-to-action button; use for the rare action affordances (resume, external project links), never as a SaaS-style hero CTA.

```jsx
<Button variant="solid" href="/resume.pdf">Read the CV</Button>
<Button variant="ghost" iconRight={<span aria-hidden>↗</span>}>GitHub</Button>
<Button variant="text" size="sm">back to overview</Button>
```

Variants: `solid` (filled accent, dark ink), `ghost` (hairline outline, fills with `--accent-soft` on hover), `text` (link-like). Sizes `sm` / `md`. Radius and accent follow the active `[data-scale]`. Renders an `<a>` when `href` is set. No hover-scale by design.
