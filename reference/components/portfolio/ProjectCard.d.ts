import * as React from "react";

export interface ProjectCardProps {
  title: string;
  /** Links the title out (GitHub / paper). Optional. */
  href?: string;
  /** One-sentence description. */
  description?: string;
  /** Domain / tech tags. */
  tags?: string[];
  /** Right-aligned meta, e.g. "★ 397" or a date. */
  meta?: string;
  /** Light backdrop blur for cards over the 3D scene. Use sparingly. */
  glass?: boolean;
  style?: React.CSSProperties;
}

/**
 * Project card: title-as-link, one sentence, tags. Quiet hairline, sharp
 * corners, accent-tinted hover. Inherits radius/accent from the active scale.
 *
 * @startingPoint section="Portfolio" subtitle="Featured project card" viewport="700x230"
 */
export function ProjectCard(props: ProjectCardProps): JSX.Element;
