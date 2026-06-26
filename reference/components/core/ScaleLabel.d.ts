import * as React from "react";

export interface ScaleLabelProps {
  /** e.g. "cellular" — lowercase. */
  scale: string;
  /** e.g. "100×". Optional. */
  magnification?: string;
  /** Show the accent dot. Default true. */
  dot?: boolean;
  style?: React.CSSProperties;
}

/** Micro scale eyebrow with accent dot. Inherits the active scale's accent. */
export function ScaleLabel(props: ScaleLabelProps): JSX.Element;
