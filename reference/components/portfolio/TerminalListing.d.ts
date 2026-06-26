import * as React from "react";

export interface TerminalItem {
  name: string;
  description?: string;
  /** Star count, shown right-aligned in gold when present. */
  stars?: number | string;
  href?: string;
  /** Permission string. Default "drwxr-xr-x". */
  perms?: string;
}

export interface TerminalListingProps {
  /** Prompt path. Default "~/projects". */
  cwd?: string;
  items: TerminalItem[];
  style?: React.CSSProperties;
}

/**
 * Tier-2 projects as an `ls -la` listing. Monospace, syntax-colored, no card
 * chrome, row-hover highlight, names link out. Square corners.
 *
 * @startingPoint section="Portfolio" subtitle="Terminal ls -la project listing" viewport="760x320"
 */
export function TerminalListing(props: TerminalListingProps): JSX.Element;
