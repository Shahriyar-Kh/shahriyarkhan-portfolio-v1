import type { AnchorHTMLAttributes, ReactNode } from "react";

export interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
}

/**
 * The single place in this codebase an <a target="_blank"> is written.
 * Always carries rel="noopener noreferrer" - no raw target="_blank"
 * anchor should exist anywhere else (verified in Step 12's grep).
 */
export function ExternalLink({ href, children, ...rest }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}
