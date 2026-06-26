import * as React from "react";

export interface ButtonProps {
  children: React.ReactNode;
  /** solid = filled accent, ghost = hairline outline, text = link-like. Default "ghost". */
  variant?: "solid" | "ghost" | "text";
  /** Default "md". */
  size?: "sm" | "md";
  /** Render as an anchor when set. */
  href?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

/**
 * Quiet call-to-action. Radius and accent follow the active scale.
 * Hover shifts background/opacity, never scale.
 *
 * @startingPoint section="Core" subtitle="Button variants & sizes" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
