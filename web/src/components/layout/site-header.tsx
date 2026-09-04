"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLink } from "@/components/layout/nav-link";
import { SkMark } from "@/components/motif/sk-mark";
import { Button } from "@/components/ui/button";
import { PRIMARY_NAV } from "@/content/nav";
import { cn } from "@/lib/cn";

/**
 * Sticky brand header. FINAL-DESIGN-01A-R4 Part B: permanently a dark
 * (ink), translucent, blurred surface with paper-colored text - not the
 * previous transparent-over-hero / solid-over-scroll crossover.
 *
 * That crossover assumed every route opens on the homepage's ink hero, so
 * "transparent + light text" was safe for the first 96px of scroll. It
 * isn't: every inner page (/about, /work, /services, /skills, /experience,
 * /resume, /contact, /privacy) opens directly on the paper background, so
 * the transparent state put light (paper-primary) nav text over a light
 * page for the first 96px of every one of those routes - genuinely
 * unreadable, not just low-contrast. One constant dark surface removes
 * that failure mode structurally instead of patching contrast per route;
 * scroll position now only strengthens the border/shadow as a depth cue,
 * never changes text/background color.
 *
 * FINAL-DESIGN-01A-R6-FIX3: the desktop-nav/mobile-trigger switch uses a
 * dedicated `header-nav:` breakpoint (840px, see globals.css) instead of
 * Tailwind's default `md` (768px) - at 768px the brand link wrapped onto
 * two lines because the full nav + Résumé CTA didn't actually fit yet
 * (measured in a real browser; see globals.css's token comment for the
 * exact numbers). This component also measures its own real rendered
 * height via ResizeObserver and publishes it as `--header-h` on the root
 * element, so mobile-nav.tsx's portalled panel can position itself
 * exactly flush against the header's actual box - not an assumed
 * h-16/sm:h-20 value that could drift out of sync.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ticking = false;
    const THRESHOLD = 96;

    const update = () => {
      ticking = false;
      setScrolled(window.scrollY > THRESHOLD);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const publishHeight = () => {
      document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    };

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-(--z-header) border-b bg-ink/92 text-paper-primary backdrop-blur-md transition-[border-color,box-shadow] duration-(--motion-base) ease-(--ease-out)",
        scrolled ? "border-border-on-ink shadow-elevation-sm" : "border-transparent",
      )}
    >
      <div className="section-shell flex h-16 items-center justify-between sm:h-20">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-body font-semibold whitespace-nowrap text-paper-primary">
          <SkMark tone="on-ink" pulse className="h-6" />
          Shahriyar Khan
        </Link>

        <nav className="hidden items-center gap-1 header-nav:flex" aria-label="Primary">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-4 header-nav:flex">
          <Button href="/resume" variant="primary-on-ink" size="sm" className="font-semibold">
            Résumé
          </Button>
        </div>

        <MobileNav items={PRIMARY_NAV} />
      </div>
    </header>
  );
}
