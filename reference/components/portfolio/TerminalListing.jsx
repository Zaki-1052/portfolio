import React from "react";

/**
 * TerminalListing — Tier 2 projects as a styled `ls -la` directory.
 * Pure terminal aesthetic: Fira Code, Atom One Dark syntax colors, no card
 * chrome. Rows have a faint hover background and the name links out. Star
 * counts right-aligned in gold. Square corners always.
 */
export function TerminalListing({ cwd = "~/projects", items = [], style, ...rest }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        lineHeight: 1.7,
        background: "var(--surface-deep)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-square)",
        maxWidth: "var(--measure-wide)",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--hairline)", color: "var(--text-muted)" }}>
        <span style={{ color: "var(--syntax-fn)" }}>{cwd}</span>{" "}
        <span style={{ color: "var(--text-faint)" }}>$</span>{" "}
        <span style={{ color: "var(--text-body)" }}>ls -la</span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: "6px 0" }}>
        {items.map((it) => (
          <Row key={it.name} {...it} />
        ))}
      </ul>
    </div>
  );
}

function Row({ name, description, stars, href, perms = "drwxr-xr-x" }) {
  const [hover, setHover] = React.useState(false);
  const inner = (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, max-content) minmax(0, 1fr) max-content",
        gap: "var(--space-4)",
        alignItems: "baseline",
        padding: "5px 16px",
        background: hover ? "rgba(152,195,121,0.08)" : "transparent",
        transition: "background var(--dur-fast) var(--ease-out)",
        textDecoration: "none",
      }}
    >
      <span style={{ color: "var(--syntax-perm)" }}>{perms}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ color: hover ? "var(--accent)" : "var(--text-strong)", fontWeight: "var(--weight-medium)" }}>{name}</span>
        <span style={{ color: "var(--text-faint)" }}>/</span>
        {description && <span style={{ color: "var(--text-muted)", marginLeft: "var(--space-4)" }}>{description}</span>}
      </span>
      <span style={{ color: "var(--syntax-star)", whiteSpace: "nowrap", textAlign: "right" }}>
        {stars ? `★ ${stars}` : ""}
      </span>
    </div>
  );
  return (
    <li>
      {href ? (
        <a href={href} style={{ textDecoration: "none", display: "block" }}>
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  );
}
