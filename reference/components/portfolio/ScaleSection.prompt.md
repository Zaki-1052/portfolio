Wrapper for one biological scale; owns `[data-scale]` so everything inside inherits that scale's accent, background, heading font and radius.

```jsx
<ScaleSection scale="chromatin" magnification="10,000×" title="What I write down">
  <p className="prose">Publications and research writeups live here.</p>
</ScaleSection>
```

Renders the arrival eyebrow (scale · magnification with accent dot), an optional kicker + title, then children in normal flow. `full` makes it 100vh for arrival moments. Left-aligned by default; `center` is rare. This is the backbone of every page in this system.
