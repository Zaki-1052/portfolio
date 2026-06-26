import * as React from "react";

export interface DepthScale {
  id: string;
  /** lowercase, e.g. "chromatin". */
  name: string;
  /** evocative magnification, e.g. "10,000×". */
  magnification?: string;
}

export interface DepthIndicatorProps {
  scales: DepthScale[];
  activeId: string;
  /** Intra-scale progress 0–1, fills the line up to the active dot. */
  progress?: number;
  onJump?: (id: string) => void;
  /** Render in normal flow instead of fixed to the right edge. Default false. */
  inline?: boolean;
  style?: React.CSSProperties;
}

/** Right-edge scale bar: dots per scale, glowing active dot, label, jump-nav. */
export function DepthIndicator(props: DepthIndicatorProps): JSX.Element;
