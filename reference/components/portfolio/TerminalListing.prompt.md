Tier-2 projects as a styled `ls -la` listing at the code scale. Monospace, syntax-colored, no card chrome, names link out, stars right-aligned in gold.

```jsx
<TerminalListing
  cwd="~/projects"
  items={[
    { name: "GPTPortal", description: "Multi-provider AI chat interface", stars: 397, href: "https://github.com/Zaki-1052/GPTPortal" },
    { name: "WebReg", description: "UCSD course auto-enroller (Rust)", href: "#" },
  ]}
/>
```

Square corners always. Row hover paints a faint green wash. Keep descriptions to one line. Place inside a `[data-scale="code"]` section so the accent resolves to green.
