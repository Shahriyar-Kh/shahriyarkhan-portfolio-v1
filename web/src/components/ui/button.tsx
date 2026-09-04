"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useMagneticHover } from "@/lib/motion/use-magnetic-hover";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "primary-on-ink" | "secondary-on-ink" | "ghost-on-ink";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border border-border text-ink-primary hover:border-primary/60",
  ghost: "text-ink-secondary hover:text-ink-primary",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
  // For use on the inverted (surface-ink) bands - footer, hero, the
  // dual-cta panel, and the now-permanently-dark header/mobile nav - where
  // the default variants' ink-toned text would be invisible against a
  // near-black background.
  "primary-on-ink": "bg-primary-on-ink text-ink hover:opacity-90",
  "secondary-on-ink": "border border-border-on-ink text-paper-primary hover:border-primary-on-ink/60",
  "ghost-on-ink": "text-paper-secondary hover:text-paper-primary",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-caption-sm px-3 py-1.5",
  md: "text-body-sm px-4 py-2.5",
  lg: "text-body px-6 py-3",
};

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium transition-opacity duration-(--motion-fast) disabled:pointer-events-none disabled:opacity-50";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Opt-in small pointer-follow on fine-pointer hover (FINAL-DESIGN-01A-R3
   * "CTAs: small magnetic... response only on fine pointers") - see
   * lib/motion/use-magnetic-hover.ts. Off by default; reserve for the
   * page's primary conversion CTAs, not every button. */
  magnetic?: boolean;
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * Renders a <button> or, when `href` is given, a next/link. Deliberately
 * no rounded-pill shape - variants are distinguished typographically
 * (fill vs. border vs. text-only), not by shape, per the brand
 * direction's anti-template rule against uniform pill buttons.
 */
export function Button({ variant = "primary", size = "md", className, children, magnetic = false, ...rest }: ButtonProps) {
  const classes = cn(
    BASE,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    magnetic && "transition-[opacity,transform] duration-150 ease-out",
    className,
  );
  const magneticRef = useMagneticHover<HTMLAnchorElement & HTMLButtonElement>(magnetic);

  if ("href" in rest && typeof rest.href === "string") {
    const { href, ...anchorRest } = rest;
    return (
      <Link ref={magnetic ? magneticRef : undefined} href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button ref={magnetic ? magneticRef : undefined} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
