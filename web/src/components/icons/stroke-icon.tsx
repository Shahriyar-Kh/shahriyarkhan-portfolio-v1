import type { SVGProps } from "react";

export interface StrokeIconProps extends Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill" | "stroke"> {
  viewBox: string;
  size?: number | string;
}

/**
 * The shared stroke language every hand-drawn icon in
 * components/icons/ builds on, matching the SK signature motif exactly
 * (motif/sk-mark.tsx): 2px stroke, currentColor, no fill, square
 * linecaps, miter joins. Centralizing this here means the convention is
 * enforced once, not copy-pasted per icon.
 */
export function StrokeIcon({ viewBox, size = 20, children, ...rest }: StrokeIconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}
