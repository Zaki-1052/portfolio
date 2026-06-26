/* @ds-bundle: {"format":3,"namespace":"BiologicalScaleDescentDesignSystem_acc404","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"ScaleLabel","sourcePath":"components/core/ScaleLabel.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"DepthIndicator","sourcePath":"components/portfolio/DepthIndicator.jsx"},{"name":"ProjectCard","sourcePath":"components/portfolio/ProjectCard.jsx"},{"name":"ScaleSection","sourcePath":"components/portfolio/ScaleSection.jsx"},{"name":"TerminalListing","sourcePath":"components/portfolio/TerminalListing.jsx"}],"sourceHashes":{"components/core/Button.jsx":"3acb49566374","components/core/ScaleLabel.jsx":"e6277283c626","components/core/Tag.jsx":"3a8a1b78f719","components/portfolio/DepthIndicator.jsx":"c0a4f2e59820","components/portfolio/ProjectCard.jsx":"b72108e46997","components/portfolio/ScaleSection.jsx":"b98d68a98934","components/portfolio/TerminalListing.jsx":"f984dd4f76ad","ui_kits/portfolio/ArrivalHero.jsx":"1e9111a52079","ui_kits/portfolio/ChromatinPublications.jsx":"857cc80e69db","ui_kits/portfolio/CodeTerminal.jsx":"36a59c2a4918","ui_kits/portfolio/Contact.jsx":"6102c0463a18","ui_kits/portfolio/DendriteIndex.jsx":"afab087b9637","ui_kits/portfolio/ProteinMD.jsx":"a7258a4afc3e","ui_kits/portfolio/tweaks-panel.jsx":"6591467622ed"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.BiologicalScaleDescentDesignSystem_acc404 = window.BiologicalScaleDescentDesignSystem_acc404 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — quiet, restrained call-to-action.
 * Variants: solid (filled accent), ghost (hairline), text (link-like).
 * No transform-scale on hover (banned); interaction is opacity/bg/color.
 * Radius follows the current scale via --radius (soft at top, square at code).
 */
function Button({
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
    transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out)",
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--text-strong)",
    WebkitFontSmoothing: "antialiased"
  };
  const variants = {
    solid: {
      background: "var(--accent)",
      color: "var(--text-on-accent)",
      borderColor: "var(--accent)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-strong)",
      borderColor: "var(--accent-line)"
    },
    text: {
      background: "transparent",
      color: "var(--accent)",
      borderColor: "transparent",
      padding: size === "sm" ? "4px 2px" : "6px 2px"
    }
  };
  const style = {
    ...base,
    ...variants[variant],
    ...(rest.style || {})
  };
  const {
    style: _ignore,
    ...domRest
  } = rest;
  const onEnter = e => {
    if (disabled) return;
    if (variant === "solid") e.currentTarget.style.opacity = "0.86";
    if (variant === "ghost") {
      e.currentTarget.style.background = "var(--accent-soft)";
      e.currentTarget.style.borderColor = "var(--accent)";
    }
    if (variant === "text") e.currentTarget.style.opacity = "0.78";
  };
  const onLeave = e => {
    if (disabled) return;
    e.currentTarget.style.opacity = "1";
    if (variant === "ghost") {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.borderColor = "var(--accent-line)";
    }
  };
  const content = /*#__PURE__*/React.createElement(React.Fragment, null, iconLeft, children, iconRight);
  if (href && !disabled) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      style: style,
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      onClick: onClick
    }, domRest), content);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    style: style,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave
  }, domRest), content);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/ScaleLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ScaleLabel — the micro "scale · magnification" eyebrow used at section
 * arrivals and in the depth indicator. Lowercase, all-caps tracking, a small
 * accent dot. Reads the active scale from context (the nearest [data-scale]).
 */
function ScaleLabel({
  scale,
  magnification,
  dot = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-2xs)",
      letterSpacing: "var(--tracking-caps)",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "var(--accent)",
      boxShadow: "var(--glow-accent)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", null, scale, magnification ? ` · ${magnification}` : ""));
}
Object.assign(__ds_scope, { ScaleLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ScaleLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — a domain or tech label. Lowercase, monospace, hairline pill.
 * Used in project cards and prose. Tone "accent" tints to the scale color.
 */
function Tag({
  children,
  tone = "muted",
  style,
  ...rest
}) {
  const tones = {
    muted: {
      color: "var(--text-muted)",
      borderColor: "var(--hairline)"
    },
    accent: {
      color: "var(--accent)",
      borderColor: "var(--accent-line)"
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
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
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/portfolio/DepthIndicator.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DepthIndicator — the thinnest possible nav. A thin vertical line with a dot
 * at each scale boundary, pinned to the right edge. The active dot is brighter,
 * slightly larger, and glows in the current accent. The segment up to the
 * active scale fills to show descent progress. Clicking a dot jumps to a scale.
 *
 * Positioning is fixed by default; pass `inline` to render it in normal flow
 * (for specimens). z-index stays under 100.
 */
function DepthIndicator({
  scales = [],
  activeId,
  progress = 0,
  onJump,
  inline = false,
  style,
  ...rest
}) {
  const activeIndex = Math.max(0, scales.findIndex(s => s.id === activeId));
  const fillPct = scales.length > 1 ? (activeIndex + progress) / (scales.length - 1) * 100 : 0;
  return /*#__PURE__*/React.createElement("nav", _extends({
    "aria-label": "Scale depth",
    style: {
      position: inline ? "relative" : "fixed",
      top: inline ? "auto" : "50%",
      right: inline ? "auto" : "clamp(12px, 2vw, 28px)",
      transform: inline ? "none" : "translateY(-50%)",
      zIndex: inline ? "auto" : "var(--z-nav)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingLeft: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      top: 6,
      bottom: 6,
      left: "50%",
      width: 1,
      transform: "translateX(-50%)",
      background: "var(--hairline)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      top: 6,
      left: "50%",
      width: 1,
      height: `calc(${fillPct}% - 12px * ${fillPct / 100})`,
      transform: "translateX(-50%)",
      background: "var(--accent-line)",
      transition: "height var(--dur-base) var(--ease-out)"
    }
  }), scales.map((s, i) => {
    const active = s.id === activeId;
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      onClick: () => onJump && onJump(s.id),
      "aria-current": active ? "true" : undefined,
      title: s.name,
      style: {
        position: "relative",
        appearance: "none",
        background: "transparent",
        border: 0,
        cursor: "pointer",
        padding: "10px 6px",
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      "data-scale": active ? s.id : undefined,
      style: {
        width: active ? 9 : 5,
        height: active ? 9 : 5,
        borderRadius: "50%",
        background: active ? "var(--accent)" : "var(--text-faint)",
        boxShadow: active ? "var(--glow-accent)" : "none",
        transition: "all var(--dur-base) var(--ease-out)"
      }
    }), active && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        right: "calc(100% + 4px)",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "var(--tracking-caps)",
        textTransform: "uppercase",
        color: "var(--text-muted)"
      }
    }, s.name, s.magnification ? ` · ${s.magnification}` : ""));
  })));
}
Object.assign(__ds_scope, { DepthIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/portfolio/DepthIndicator.jsx", error: String((e && e.message) || e) }); }

// components/portfolio/ProjectCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ProjectCard — a single project: title (links out), one-sentence
 * description, a row of tags. Sharp-ish corners, quiet hairline, restrained
 * shadow. `glass` adds a light backdrop blur for cards that sit over the 3D
 * scene (use sparingly). Hover lifts the border and title, never scales.
 */
function ProjectCard({
  title,
  href,
  description,
  tags = [],
  meta,
  glass = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("article", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      padding: "var(--space-5)",
      borderRadius: "var(--radius)",
      border: "1px solid",
      borderColor: hover ? "var(--accent-line)" : "var(--hairline)",
      background: glass ? "var(--surface-overlay)" : "var(--surface-raised)",
      backdropFilter: glass ? "blur(10px)" : "none",
      WebkitBackdropFilter: glass ? "blur(10px)" : "none",
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
      transition: "border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
      maxWidth: "var(--measure-wide)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: "var(--space-3)",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: "var(--text-lg)",
      color: hover ? "var(--accent)" : "var(--text-strong)",
      transition: "color var(--dur-fast) var(--ease-out)"
    }
  }, href ? /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      color: "inherit",
      textDecoration: "none"
    }
  }, title, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      opacity: hover ? 1 : 0,
      marginLeft: 8,
      fontSize: "0.8em",
      transition: "opacity var(--dur-fast) var(--ease-out)"
    }
  }, "\u2197")) : title), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      whiteSpace: "nowrap",
      flex: "none"
    }
  }, meta)), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--text-body)",
      fontSize: "var(--text-base)",
      lineHeight: "var(--leading-normal)",
      maxWidth: "62ch"
    }
  }, description), tags.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-2)",
      marginTop: "var(--space-1)"
    }
  }, tags.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      lineHeight: 1,
      padding: "4px 8px",
      borderRadius: "var(--radius-sharp)",
      border: "1px solid var(--hairline)",
      color: "var(--text-muted)"
    }
  }, t))));
}
Object.assign(__ds_scope, { ProjectCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/portfolio/ProjectCard.jsx", error: String((e && e.message) || e) }); }

// components/portfolio/ScaleSection.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ScaleSection — wrapper for one biological scale. Sets [data-scale] so all
 * descendants inherit that scale's accent, background, heading font and
 * radius. Lays out the arrival eyebrow + title, then the content in normal
 * document flow (no absolute positioning). Left-aligned by default.
 */
function ScaleSection({
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
  return /*#__PURE__*/React.createElement("section", _extends({
    "data-scale": scale,
    style: {
      position: "relative",
      background: "var(--bg)",
      color: "var(--text-body)",
      minHeight: full ? "100vh" : "auto",
      padding: "var(--section-pad-y) var(--gutter)",
      transition: "background var(--dur-slow) var(--ease-in-out)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "min(1080px, 100%)",
      margin: align === "center" ? "0 auto" : "0",
      textAlign: align
    }
  }, (scale || magnification) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-2xs)",
      letterSpacing: "var(--tracking-caps)",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      marginBottom: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "var(--accent)",
      boxShadow: "var(--glow-accent)"
    }
  }), /*#__PURE__*/React.createElement("span", null, scale, magnification ? ` · ${magnification}` : "")), kicker && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      color: "var(--accent)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      letterSpacing: "0.02em"
    }
  }, kicker), title && /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 var(--space-6)",
      fontSize: "var(--text-3xl)",
      maxWidth: "20ch"
    }
  }, title), children));
}
Object.assign(__ds_scope, { ScaleSection });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/portfolio/ScaleSection.jsx", error: String((e && e.message) || e) }); }

// components/portfolio/TerminalListing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TerminalListing — Tier 2 projects as a styled `ls -la` directory.
 * Pure terminal aesthetic: Fira Code, Atom One Dark syntax colors, no card
 * chrome. Rows have a faint hover background and the name links out. Star
 * counts right-aligned in gold. Square corners always.
 */
function TerminalListing({
  cwd = "~/projects",
  items = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      lineHeight: 1.7,
      background: "var(--surface-deep)",
      border: "1px solid var(--hairline)",
      borderRadius: "var(--radius-square)",
      maxWidth: "var(--measure-wide)",
      overflow: "hidden",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 16px",
      borderBottom: "1px solid var(--hairline)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--syntax-fn)"
    }
  }, cwd), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-faint)"
    }
  }, "$"), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-body)"
    }
  }, "ls -la")), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: "6px 0"
    }
  }, items.map(it => /*#__PURE__*/React.createElement(Row, _extends({
    key: it.name
  }, it)))));
}
function Row({
  name,
  description,
  stars,
  href,
  perms = "drwxr-xr-x"
}) {
  const [hover, setHover] = React.useState(false);
  const inner = /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(0, max-content) minmax(0, 1fr) max-content",
      gap: "var(--space-4)",
      alignItems: "baseline",
      padding: "5px 16px",
      background: hover ? "rgba(152,195,121,0.08)" : "transparent",
      transition: "background var(--dur-fast) var(--ease-out)",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--syntax-perm)"
    }
  }, perms), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: hover ? "var(--accent)" : "var(--text-strong)",
      fontWeight: "var(--weight-medium)"
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-faint)"
    }
  }, "/"), description && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      marginLeft: "var(--space-4)"
    }
  }, description)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--syntax-star)",
      whiteSpace: "nowrap",
      textAlign: "right"
    }
  }, stars ? `★ ${stars}` : ""));
  return /*#__PURE__*/React.createElement("li", null, href ? /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      textDecoration: "none",
      display: "block"
    }
  }, inner) : inner);
}
Object.assign(__ds_scope, { TerminalListing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/portfolio/TerminalListing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/ArrivalHero.jsx
try { (() => {
// Tissue scale — the hero / identity. Serif, warm, soft, asymmetric.
function ArrivalHero() {
  const {
    ScaleSection
  } = window.BiologicalScaleDescentDesignSystem_acc404;
  return /*#__PURE__*/React.createElement(ScaleSection, {
    scale: "tissue",
    magnification: "1\xD7",
    full: true,
    className: "grain bloom",
    style: {
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "kit-content",
    style: {
      maxWidth: 760
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-3)",
      color: "var(--accent)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      letterSpacing: "0.02em"
    }
  }, "computational biology @ UCSD"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-serif)",
      fontSize: "var(--text-5xl)",
      lineHeight: 1.02,
      letterSpacing: "-0.02em",
      margin: "0 0 var(--space-5)",
      maxWidth: "12ch"
    }
  }, "Zara Alibhai"), /*#__PURE__*/React.createElement("div", {
    className: "prose",
    style: {
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("p", null, "I build the computational infrastructure for epigenetics research. Mostly cerebellum, mostly chromatin, mostly in R and my terminal."), /*#__PURE__*/React.createElement("p", null, "Right now I work in two labs at UCSD. One asks how losing a single histone enzyme rewires the 3D genome of the developing brain. The other is teaching me molecular dynamics, one trajectory at a time."), /*#__PURE__*/React.createElement("p", null, "Nearly everything I touch turns out to be about the brain. So this site goes there, all the way down.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-6)",
      padding: "var(--space-4) var(--space-5)",
      border: "1px solid var(--hairline)",
      borderRadius: "var(--radius)",
      background: "var(--surface-overlay)",
      maxWidth: 540
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      marginBottom: 6,
      letterSpacing: "0.04em"
    }
  }, "currently"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      color: "var(--text-body)"
    }
  }, "molecular dynamics of a postsynaptic membrane protein at the Amaro Lab")), /*#__PURE__*/React.createElement("div", {
    className: "scroll-hint"
  }, "descend ", /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u2193"))));
}
window.ArrivalHero = ArrivalHero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/ArrivalHero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/ChromatinPublications.jsx
try { (() => {
// Chromatin scale — publications and research writeups. Inter headings,
// blue home-base accent, neutral. "Your writing is regulation of how people
// understand your work."
function ChromatinPublications() {
  const {
    ScaleSection
  } = window.BiologicalScaleDescentDesignSystem_acc404;
  const writeups = [{
    status: "in prep · fall 2026",
    title: "Regulation of chromatin conformation by the histone deubiquitinase BAP1 in the brain",
    body: "BAP1 loss drives H2AK119ub accumulation, which collapses distance-dependent loops and breaks enhancer-gene connections at synaptic and developmental loci. Presented at the UCSD Undergraduate Research Conference and the ACS-SA Symposium.",
    venue: "URC · ACS-SA Symposium"
  }, {
    status: "in prep · fall 2026",
    title: "Coordinated methylation and hydroxymethylation changes at gene bodies after BAP1 loss",
    body: "Genome-wide 5mC gain paired with 5hmC loss at ~6,750 gene bodies, integrated with ATAC-seq, RNA-seq and CUT&RUN for H2AK119ub and H3K27ac/me3. Logistic regression and permutation testing to model the predictors.",
    venue: "Ferguson Lab"
  }];
  return /*#__PURE__*/React.createElement(ScaleSection, {
    scale: "chromatin",
    magnification: "10,000\xD7",
    title: "What I write down",
    kicker: "the regulation layer"
  }, /*#__PURE__*/React.createElement("p", {
    className: "prose",
    style: {
      marginBottom: "var(--space-7)",
      maxWidth: "64ch"
    }
  }, "Writing is its own kind of regulation. It decides how people read the work. Two papers are heading out this fall, both on what happens to the developing cerebellum when BAP1 goes missing."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)",
      maxWidth: "var(--measure)"
    }
  }, writeups.map(w => /*#__PURE__*/React.createElement("article", {
    key: w.title,
    style: {
      borderLeft: "1px solid var(--accent-line)",
      paddingLeft: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      color: "var(--accent)",
      marginBottom: "var(--space-2)",
      letterSpacing: "0.03em"
    }
  }, w.status), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 var(--space-3)",
      fontSize: "var(--text-lg)",
      color: "var(--text-strong)",
      maxWidth: "40ch"
    }
  }, w.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-3)",
      color: "var(--text-body)",
      lineHeight: "var(--leading-normal)"
    }
  }, w.body), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, w.venue)))));
}
window.ChromatinPublications = ChromatinPublications;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/ChromatinPublications.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/CodeTerminal.jsx
try { (() => {
// Code scale — terminal aesthetic. Fira Code headings, green accent, square
// corners, no post-processing. Featured Tier-1 software, then the Tier-2
// ls -la listing.
function CodeTerminal() {
  const {
    ScaleSection,
    TerminalListing
  } = window.BiologicalScaleDescentDesignSystem_acc404;
  const tier2 = [{
    name: "GPTPortal",
    description: "Multi-provider AI chat interface",
    stars: 397,
    href: "https://github.com/Zaki-1052/GPTPortal"
  }, {
    name: "WebReg",
    description: "UCSD course enrollment auto-enroller (Rust, Tokio)",
    href: "https://github.com/Zaki-1052/WebReg-Auto-Enroller"
  }, {
    name: "AO3-Explorer",
    description: "Reading-history exporter + explorer",
    href: "https://github.com/Zaki-1052/AO3-History-Explorer"
  }, {
    name: "YeastMSA",
    description: "Reference-guided MSA, w303 genome",
    href: "https://github.com/Zaki-1052/Yeast_MSA"
  }, {
    name: "MPro-Analysis",
    description: "SARS-CoV-2 protease MD analysis",
    href: "https://github.com/Zaki-1052"
  }, {
    name: "Crime-Analysis",
    description: "Political leaning vs. incarceration (R)",
    href: "https://github.com/Zaki-1052/Crime_Analysis"
  }];
  return /*#__PURE__*/React.createElement(ScaleSection, {
    scale: "code",
    title: "~/projects",
    kicker: "the sequence level"
  }, /*#__PURE__*/React.createElement("p", {
    className: "prose",
    style: {
      marginBottom: "var(--space-6)",
      maxWidth: "70ch",
      fontSize: "var(--text-base)"
    }
  }, "At the base level, where the nucleotides are, is where the actual code lives. 300+ analysis scripts, ~100,000 lines across 20 projects, mostly R, Python and Bash. A few of them grew into real software."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "var(--space-6)",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Featured, {
    name: "cleave",
    line: "Self-hosted CUT&RUN platform. React + FastAPI + PostgreSQL on AWS. 8 pipelines, 68+ endpoints, 600+ tests, 60k LoC.",
    href: "https://github.com/Zaki-1052/cleave"
  }), /*#__PURE__*/React.createElement(Featured, {
    name: "metaencode",
    line: "ENCODE similarity engine. SBERT embeddings, UMAP / t-SNE, faceted search with spell correction.",
    href: "https://github.com/Zaki-1052/MetaEncode"
  })), /*#__PURE__*/React.createElement(TerminalListing, {
    cwd: "~/projects",
    items: tier2
  }));
  function Featured({
    name,
    line,
    href
  }) {
    return /*#__PURE__*/React.createElement("a", {
      href: href,
      style: {
        display: "block",
        textDecoration: "none",
        border: "1px solid var(--hairline)",
        borderRadius: 0,
        padding: "var(--space-4)",
        background: "var(--surface-deep)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        color: "var(--accent)",
        marginBottom: "var(--space-2)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text-faint)"
      }
    }, "$ "), "cat ", name, "/README.md"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--text-body)",
        lineHeight: "var(--leading-normal)"
      }
    }, line));
  }
}
window.CodeTerminal = CodeTerminal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/CodeTerminal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/Contact.jsx
try { (() => {
// Expression scale — contact, socials, resume. Stays in the cool/code register
// with a faint warm return as a bookend. Mono, terminal-flavored.
function Contact() {
  const {
    ScaleSection
  } = window.BiologicalScaleDescentDesignSystem_acc404;
  const links = [{
    k: "email",
    v: "zalibhai@ucsd.edu",
    href: "mailto:zalibhai@ucsd.edu"
  }, {
    k: "github",
    v: "github.com/Zaki-1052",
    href: "https://github.com/Zaki-1052"
  }, {
    k: "linkedin",
    v: "in/zakir-alibhai",
    href: "https://www.linkedin.com/in/zakir-alibhai-541454276/"
  }, {
    k: "bluesky",
    v: "@zaki1052.bsky.social",
    href: "https://bsky.app/profile/zaki1052.bsky.social"
  }, {
    k: "resume",
    v: "zalibhai.com/cv.pdf  ↗",
    href: "#"
  }];
  return /*#__PURE__*/React.createElement(ScaleSection, {
    scale: "expression",
    title: "$ whoami --contact",
    kicker: "surface, again"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      gap: "var(--space-7)",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "prose",
    style: {
      fontSize: "var(--text-base)"
    }
  }, /*#__PURE__*/React.createElement("p", null, "That's the whole descent, tissue to code. Thanks for scrolling all the way down."), /*#__PURE__*/React.createElement("p", null, "I'm open to research collaborations, internships, and the occasional web project. If any of this was interesting, or you just want to talk cerebellum, say hi.")), /*#__PURE__*/React.createElement("nav", {
    className: "contact-links",
    "aria-label": "Contact"
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.k,
    className: "contact-row",
    href: l.href
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, l.k), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, l.v))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-9)",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      color: "var(--text-faint)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.zmark || "../../assets/z-mark.png",
    alt: "",
    width: "22",
    height: "22",
    style: {
      borderRadius: 4,
      opacity: 0.85
    }
  }), /*#__PURE__*/React.createElement("span", null, "zalibhai.com \u2014 everything is the brain, all the way down.")));
}
window.Contact = Contact;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/Contact.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/DendriteIndex.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Cellular scale — the project index as dendrite branches.
// Three branches: epigenetics, structural biology, software. Click to focus;
// others dim; the branch's project cards fade in. The FOV-focus interaction,
// flattened to the HTML content layer.
function DendriteIndex() {
  const {
    ScaleSection,
    ProjectCard
  } = window.BiologicalScaleDescentDesignSystem_acc404;
  const [focus, setFocus] = React.useState("epigenetics");
  const branches = {
    epigenetics: {
      label: "epigenetics",
      blurb: "how BAP1 loss rewires chromatin and methylation in the cerebellum",
      cards: [{
        title: "Chromatin conformation analysis (Hi-C)",
        href: "https://github.com/Zaki-1052/mariner_hi-c",
        description: "Replicate-aware differential loop calling. 2,910 dysregulated loops in BAP1-knockout mouse cerebellum, with APA, ABC, and TAD analysis.",
        tags: ["R", "mariner", "edgeR", "Hi-C"],
        meta: "Ferguson Lab"
      }, {
        title: "DNA methylation (Biomodal DUET evoC)",
        href: "https://github.com/Zaki-1052/mariner_hi-c",
        description: "A 50-script pipeline for simultaneous 5mC / 5hmC profiling. Coordinated hyper-methylation and hypo-hydroxymethylation at ~6,750 gene bodies.",
        tags: ["R", "5mC/5hmC", "DMRs", "ROC"],
        meta: "Ferguson Lab"
      }]
    },
    structural: {
      label: "structural biology",
      blurb: "modeling a postsynaptic membrane protein with molecular dynamics",
      cards: [{
        title: "Postsynaptic membrane protein MD",
        description: "Building and running the first trajectories of a CNS membrane protein. New territory for me, started June 2026.",
        tags: ["MD", "GROMACS", "structural"],
        meta: "Amaro Lab"
      }, {
        title: "Yeast regulatory network analysis",
        href: "https://github.com/Zaki-1052/Yeast_MSA",
        description: "Variant calling and gene-network reconstruction across yeast strains; hierarchical conservation in essential sterol pathways.",
        tags: ["Python", "BioPython", "bcftools"],
        meta: "Budin Lab"
      }]
    },
    software: {
      label: "software",
      blurb: "the tools and platforms that make the science runnable",
      cards: [{
        title: "Cleave",
        href: "https://github.com/Zaki-1052/cleave",
        description: "Full-stack self-hosted CUT&RUN analysis platform serving ~10 lab members. Eight pipelines, 68+ endpoints, 600+ tests, 60k LoC.",
        tags: ["React", "FastAPI", "PostgreSQL", "AWS"],
        meta: "350 files"
      }, {
        title: "MetaENCODE",
        href: "https://github.com/Zaki-1052/MetaEncode",
        description: "ENCODE dataset similarity engine. SBERT embeddings with interactive UMAP / t-SNE and faceted search.",
        tags: ["SBERT", "UMAP", "search"],
        meta: "DS3 × UBIC"
      }]
    }
  };
  const order = ["epigenetics", "structural", "software"];
  return /*#__PURE__*/React.createElement(ScaleSection, {
    scale: "cellular",
    magnification: "100\xD7",
    title: "Three branches of one tree",
    kicker: "pick a branch"
  }, /*#__PURE__*/React.createElement("p", {
    className: "prose",
    style: {
      marginBottom: "var(--space-6)",
      maxWidth: "60ch",
      fontSize: "var(--text-base)"
    }
  }, "My work splits cleanly into three domains. Click one to see what grows there. Everything here shows up again deeper in the descent, at its own scale."), /*#__PURE__*/React.createElement("div", {
    className: "branches",
    style: {
      marginBottom: "var(--space-7)"
    }
  }, order.map(key => /*#__PURE__*/React.createElement("button", {
    key: key,
    className: "branch",
    "aria-pressed": focus === key,
    "data-dim": focus !== key,
    onClick: () => setFocus(key)
  }, /*#__PURE__*/React.createElement("h4", null, branches[key].label), /*#__PURE__*/React.createElement("p", null, branches[key].blurb)))), /*#__PURE__*/React.createElement("div", {
    className: "cards-col"
  }, branches[focus].cards.map(c => /*#__PURE__*/React.createElement(ProjectCard, _extends({
    key: c.title
  }, c)))));
}
window.DendriteIndex = DendriteIndex;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/DendriteIndex.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/ProteinMD.jsx
try { (() => {
// Protein scale — the Amaro Lab molecular-dynamics work. Cyan accent, sharper,
// bloom decreasing. Honest about it being new.
function ProteinMD() {
  const {
    ScaleSection,
    Tag
  } = window.BiologicalScaleDescentDesignSystem_acc404;
  return /*#__PURE__*/React.createElement(ScaleSection, {
    scale: "protein",
    magnification: "1,000,000\xD7",
    title: "Down to the molecule",
    kicker: "structural biology, lately"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
      gap: "var(--space-7)",
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "prose"
  }, /*#__PURE__*/React.createElement("p", null, "In June 2026 I joined the Amaro Lab to model a postsynaptic CNS membrane protein with molecular dynamics. My first trajectory is running as you read this."), /*#__PURE__*/React.createElement("p", null, "I'll be honest: I find genetics more interesting than structural biology right now. But I just started, the simulations are beautiful, and the methods are pure computation, which is home for me. Ask me again in a few months."), /*#__PURE__*/React.createElement("p", null, "It fits the descent. The chromatin work asks how genes get switched. This asks what the switched-on proteins actually do, atom by atom, in a membrane.")), /*#__PURE__*/React.createElement("aside", {
    style: {
      border: "1px solid var(--hairline)",
      borderRadius: "var(--radius)",
      padding: "var(--space-5)",
      background: "var(--surface-raised)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      marginBottom: "var(--space-3)",
      letterSpacing: "0.04em"
    }
  }, "trajectory \xB7 status"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Row, {
    k: "system",
    v: "postsynaptic membrane protein"
  }), /*#__PURE__*/React.createElement(Row, {
    k: "lab",
    v: "Amaro Lab, UCSD"
  }), /*#__PURE__*/React.createElement(Row, {
    k: "state",
    v: "first trajectory running"
  }), /*#__PURE__*/React.createElement(Row, {
    k: "compute",
    v: "SDSC Expanse (SLURM)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)",
      flexWrap: "wrap",
      marginTop: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    tone: "accent"
  }, "MD"), /*#__PURE__*/React.createElement(Tag, null, "GROMACS"), /*#__PURE__*/React.createElement(Tag, null, "membrane")))));
  function Row({
    k,
    v
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: "var(--space-4)",
        alignItems: "baseline",
        borderBottom: "1px solid var(--hairline-soft)",
        paddingBottom: "var(--space-2)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        color: "var(--text-faint)"
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        color: "var(--text-body)",
        textAlign: "right"
      }
    }, v));
  }
}
window.ProteinMD = ProteinMD;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/ProteinMD.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.ScaleLabel = __ds_scope.ScaleLabel;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.DepthIndicator = __ds_scope.DepthIndicator;

__ds_ns.ProjectCard = __ds_scope.ProjectCard;

__ds_ns.ScaleSection = __ds_scope.ScaleSection;

__ds_ns.TerminalListing = __ds_scope.TerminalListing;

})();
