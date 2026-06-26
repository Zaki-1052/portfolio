import React from "react";

/**
 * ScaleLabel — the micro "scale · magnification" eyebrow used at section
 * arrivals and in the depth indicator. Lowercase, all-caps tracking, a small
 * accent dot. Reads the active scale from context (the nearest [data-scale]).
 */
export function ScaleLabel({ scale, magnification, dot = true, style, ...rest }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "var(--tracking-caps)",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "var(--glow-accent)",
            flex: "none",
          }}
        />
      )}
      <span>
        {scale}
        {magnification ? ` · ${magnification}` : ""}
      </span>
    </span>
  );
}
