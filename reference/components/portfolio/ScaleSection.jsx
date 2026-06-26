import React from "react";

/**
 * ScaleSection — wrapper for one biological scale. Sets [data-scale] so all
 * descendants inherit that scale's accent, background, heading font and
 * radius. Lays out the arrival eyebrow + title, then the content in normal
 * document flow (no absolute positioning). Left-aligned by default.
 */
export function ScaleSection({
  scale,
  magnification,
  title,
  kicker,
  children,
  full = false,
  align = "left",
  style,
  ...rest
}) {
  return (
    <section
      data-scale={scale}
      style={{
        position: "relative",
        background: "var(--bg)",
        color: "var(--text-body)",
        minHeight: full ? "100vh" : "auto",
        padding: "var(--section-pad-y) var(--gutter)",
        transition: "background var(--dur-slow) var(--ease-in-out)",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          maxWidth: "min(1080px, 100%)",
          margin: align === "center" ? "0 auto" : "0",
          textAlign: align,
        }}
      >
        {(scale || magnification) && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "var(--tracking-caps)",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "var(--space-4)",
            }}
          >
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", boxShadow: "var(--glow-accent)" }} />
            <span>{scale}{magnification ? ` · ${magnification}` : ""}</span>
          </div>
        )}

        {kicker && (
          <p style={{ margin: "0 0 var(--space-2)", color: "var(--accent)", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", letterSpacing: "0.02em" }}>
            {kicker}
          </p>
        )}

        {title && (
          <h2 style={{ margin: "0 0 var(--space-6)", fontSize: "var(--text-3xl)", maxWidth: "20ch" }}>
            {title}
          </h2>
        )}

        {children}
      </div>
    </section>
  );
}
