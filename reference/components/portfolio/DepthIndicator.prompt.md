The thinnest possible nav: a thin right-edge line with a dot per scale, a glowing active dot, a magnification label, and a fill showing descent progress.

```jsx
<DepthIndicator
  scales={[
    { id: "tissue", name: "tissue", magnification: "1×" },
    { id: "cellular", name: "cellular", magnification: "100×" },
    { id: "chromatin", name: "chromatin", magnification: "10,000×" },
  ]}
  activeId="cellular"
  progress={0.4}
  onJump={(id) => scrollToScale(id)}
/>
```

Fixed to the right edge and vertically centered by default; pass `inline` to drop it into normal flow (specimens). Dots are keyboard-focusable jump-nav. z-index stays under 100.
