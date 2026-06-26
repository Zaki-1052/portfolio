import React from "react";

/**
 * DepthIndicator — the thinnest possible nav. A thin vertical line with a dot
 * at each scale boundary, pinned to the right edge. The active dot is brighter,
 * slightly larger, and glows in the current accent. The segment up to the
 * active scale fills to show descent progress. Clicking a dot jumps to a scale.
 *
 * Positioning is fixed by default; pass `inline` to render it in normal flow
 * (for specimens). z-index stays under 100.
 */
export function DepthIndicator({
  scales = [],
  activeId,
  progress = 0,
  onJump,
  inline = false,
  style,
  ...rest
}) {
  const activeIndex = Math.max(0, scales.findIndex((s) => s.id === activeId));
  const fillPct = scales.length > 1
    ? ((activeIndex + progress) / (scales.length - 1)) * 100
    : 0;

  return (
    <nav
      aria-label="Scale depth"
      style={{
        position: inline ? "relative" : "fixed",
        top: inline ? "auto" : "50%",
        right: inline ? "auto" : "clamp(12px, 2vw, 28px)",
        transform: inline ? "none" : "translateY(-50%)",
        zIndex: inline ? "auto" : "var(--z-nav)",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0,
        ...style,
      }}
      {...rest}
    >
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", paddingLeft: 2 }}>
        {/* track */}
        <span aria-hidden="true" style={{ position: "absolute", top: 6, bottom: 6, left: "50%", width: 1, transform: "translateX(-50%)", background: "var(--hairline)" }} />
        {/* fill */}
        <span aria-hidden="true" style={{ position: "absolute", top: 6, left: "50%", width: 1, height: `calc(${fillPct}% - 12px * ${fillPct / 100})`, transform: "translateX(-50%)", background: "var(--accent-line)", transition: "height var(--dur-base) var(--ease-out)" }} />

        {scales.map((s, i) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => onJump && onJump(s.id)}
              aria-current={active ? "true" : undefined}
              title={s.name}
              style={{
                position: "relative",
                appearance: "none",
                background: "transparent",
                border: 0,
                cursor: "pointer",
                padding: "10px 6px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                aria-hidden="true"
                data-scale={active ? s.id : undefined}
                style={{
                  width: active ? 9 : 5,
                  height: active ? 9 : 5,
                  borderRadius: "50%",
                  background: active ? "var(--accent)" : "var(--text-faint)",
                  boxShadow: active ? "var(--glow-accent)" : "none",
                  transition: "all var(--dur-base) var(--ease-out)",
                }}
              />
              {active && (
                <span style={{ position: "absolute", right: "calc(100% + 4px)", whiteSpace: "nowrap", fontFamily: "var(--font-sans)", fontSize: "var(--text-2xs)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  {s.name}{s.magnification ? ` · ${s.magnification}` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
