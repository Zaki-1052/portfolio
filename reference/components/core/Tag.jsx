import React from "react";

/**
 * Tag — a domain or tech label. Lowercase, monospace, hairline pill.
 * Used in project cards and prose. Tone "accent" tints to the scale color.
 */
export function Tag({ children, tone = "muted", style, ...rest }) {
  const tones = {
    muted: { color: "var(--text-muted)", borderColor: "var(--hairline)" },
    accent: { color: "var(--accent)", borderColor: "var(--accent-line)" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        lineHeight: 1,
        letterSpacing: "0.01em",
        padding: "4px 8px",
        borderRadius: "var(--radius-sharp)",
        border: "1px solid",
        background: "transparent",
        whiteSpace: "nowrap",
        ...tones[tone],
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
