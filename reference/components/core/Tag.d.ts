import * as React from "react";

export interface TagProps {
  children: React.ReactNode;
  /** "muted" hairline, or "accent" tinted to the active scale. Default "muted". */
  tone?: "muted" | "accent";
  style?: React.CSSProperties;
}

/** Lowercase monospace label for domains and tech. Sharp corners. */
export function Tag(props: TagProps): JSX.Element;
