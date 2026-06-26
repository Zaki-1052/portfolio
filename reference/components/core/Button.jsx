import React from "react";

/**
 * Button — quiet, restrained call-to-action.
 * Variants: solid (filled accent), ghost (hairline), text (link-like).
 * No transform-scale on hover (banned); interaction is opacity/bg/color.
 * Radius follows the current scale via --radius (soft at top, square at code).
 */
export function Button({
  children,
  variant = "ghost",
  size = "md",
  href,
  iconRight,
  iconLeft,
  disabled = false,
  onClick,
  type = "button",
  ...rest
}) {
  const pad = size === "sm" ? "7px 13px" : "10px 18px";
  const fontSize = size === "sm" ? "var(--text-sm)" : "var(--text-base)";

  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    fontFamily: "var(--font-sans)",
    fontSize,
    fontWeight: "var(--weight-medium)",
    lineHeight: 1.1,
    letterSpacing: "0.01em",
    padding: pad,
    borderRadius: "var(--radius)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    textDecoration: "none",
    transition:
      "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out)",
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--text-strong)",
    WebkitFontSmoothing: "antialiased",
  };

  const variants = {
    solid: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      borderColor: "var(--accent)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-strong)",
      borderColor: "var(--accent-line)",
    },
    text: {
      background: "transparent",
      color: "var(--accent)",
      borderColor: "transparent",
      padding: size === "sm" ? "4px 2px" : "6px 2px",
    },
  };

  const style = { ...base, ...variants[variant], ...(rest.style || {}) };
  const { style: _ignore, ...domRest } = rest;

  const onEnter = (e) => {
    if (disabled) return;
    if (variant === "solid") e.currentTarget.style.opacity = "0.86";
    if (variant === "ghost") {
      e.currentTarget.style.background = "var(--accent-soft)";
      e.currentTarget.style.borderColor = "var(--accent)";
    }
    if (variant === "text") e.currentTarget.style.opacity = "0.78";
  };
  const onLeave = (e) => {
    if (disabled) return;
    e.currentTarget.style.opacity = "1";
    if (variant === "ghost") {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.borderColor = "var(--accent-line)";
    }
  };

  const content = (
    <>
      {iconLeft}
      {children}
      {iconRight}
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        style={style}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
        {...domRest}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      style={style}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      {...domRest}
    >
      {content}
    </button>
  );
}
