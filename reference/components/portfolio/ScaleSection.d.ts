import * as React from "react";

export interface ScaleSectionProps {
  /** "tissue" | "cellular" | "chromatin" | "protein" | "code" | "expression". */
  scale: "tissue" | "cellular" | "chromatin" | "protein" | "code" | "expression";
  /** Evocative magnification, e.g. "100×". */
  magnification?: string;
  /** Section title (uses the scale's heading font). */
  title?: string;
  /** Small accent kicker above the title. */
  kicker?: string;
  children?: React.ReactNode;
  /** min-height: 100vh for a full arrival section. Default false. */
  full?: boolean;
  /** Default "left" — center is rare in this system. */
  align?: "left" | "center";
  style?: React.CSSProperties;
}

/**
 * Per-scale content wrapper. Owns [data-scale] so accent/bg/font/radius all
 * shift. Normal document flow, left-aligned, capped width.
 *
 * @startingPoint section="Portfolio" subtitle="One biological-scale content section" viewport="900x520"
 */
export function ScaleSection(props: ScaleSectionProps): JSX.Element;
