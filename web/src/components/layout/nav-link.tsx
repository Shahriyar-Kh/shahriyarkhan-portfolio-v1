"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * FINAL-DESIGN-01A-R4 Part B: a rounded hover/focus capsule, not the old
 * underline-only treatment. Both the header and the mobile menu are now a
 * permanent dark (ink) surface (see site-header.tsx's doc comment), so
 * this only ever needs the one paper-on-ink palette - the previous
 * "ink" tone existed solely for the header's now-removed transparent/
 * solid crossover and has no remaining caller.
 *
 * Active state is carried by shape AND color together (a permanently
 * visible bordered capsule with an orange-tinted fill), not by color
 * alone - inactive links only grow that same capsule on hover/focus, so
 * keyboard focus quality matches pointer-hover quality exactly.
 * `data-nav-capsule` opts into the fine-pointer light-sweep defined in
 * globals.css.
 */
export function NavLink({ href, children, className, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      data-nav-capsule
      className={cn(
        "relative inline-flex items-center rounded-full border px-3.5 py-1.5 text-body-sm transition-[background-color,border-color,color] duration-(--motion-fast)",
        isActive
          ? "border-primary-on-ink/40 bg-primary-on-ink/12 text-paper-primary"
          : "border-transparent text-paper-tertiary hover:border-paper-primary/15 hover:bg-paper-primary/8 hover:text-paper-primary focus-visible:border-paper-primary/15 focus-visible:bg-paper-primary/8 focus-visible:text-paper-primary",
        className,
      )}
    >
      {children}
    </Link>
  );
}
