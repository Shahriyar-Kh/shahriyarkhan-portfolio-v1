"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "@/components/layout/nav-link";
import { SkMark } from "@/components/motif/sk-mark";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { Icon } from "@/components/ui/icon";
import { CONTACT_FALLBACKS, OWNER_NAME, SOCIAL_LINKS } from "@/content/site";
import type { NavItem } from "@/content/nav";

export interface MobileNavProps {
  items: readonly NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close on route change - adjusted during render (React's own
  // recommended pattern for "reset state when a prop changes") rather
  // than in an effect, which avoids an extra render pass.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Body scroll lock while open. FINAL-DESIGN-01A-R6-FIX3: a plain
  // `overflow: hidden` on the body is known to leak scroll/rubber-band
  // motion on iOS Safari even while "locked" - the classic trigger for
  // the panel's fixed header boundary and its scrollable content
  // appearing briefly out of sync during a touch-scroll gesture. Locks
  // with the standard `position: fixed` technique instead, which removes
  // the body from the scroll flow entirely (nothing left to leak), and
  // restores the exact prior scroll position on close.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Auto-close if the viewport is resized/rotated past the header's
  // desktop-nav breakpoint while the mobile panel is open - the trigger
  // that opened it disappears at that width (CSS-hidden), so the panel
  // must not be left stranded open with no way to reach it. Reads the
  // same `--header-nav` breakpoint token site-header.tsx's Tailwind
  // classes use (globals.css's `@theme` block), so this can never drift
  // out of sync with the CSS switch. Only reacts to a *subsequent*
  // change - the trigger is already CSS-hidden at desktop widths, so it
  // cannot be opened there in the first place; setState only ever runs
  // inside the change-event callback, never synchronously in the effect
  // body itself.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== "function") return;
    const breakpoint = getComputedStyle(document.documentElement).getPropertyValue("--breakpoint-header-nav").trim();
    if (!breakpoint) return;
    const query = window.matchMedia(`(min-width: ${breakpoint})`);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [open]);

  // Escape closes; focus trap while open.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    panel?.querySelector<HTMLElement>("a, button")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="header-nav:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center text-paper-primary"
      >
        {open ? <Icon.Close size={20} aria-hidden /> : <Icon.Menu size={20} aria-hidden />}
      </button>

      {/* Portalled to document.body: the header (this component's normal
       * DOM parent) has backdrop-filter for its glass effect, and
       * backdrop-filter/filter on an ancestor makes it the containing
       * block for `position: fixed` descendants (CSS Filter Effects
       * spec) - so without the portal this panel's positioning would
       * resolve against the header's own box, not the viewport.
       *
       * FINAL-DESIGN-01A-R6-FIX3: top offset and height are both driven
       * by `--header-h` (published by site-header.tsx's ResizeObserver)
       * rather than a static top-16/sm:top-20 + bottom-0 guess, so the
       * panel's content can never start above the header's actual
       * rendered bottom edge - eliminating the clipped-sliver defect
       * regardless of font metrics or viewport-chrome differences. Height
       * is `calc(100dvh - var(--header-h))` (not `bottom-0`), so it
       * tracks mobile browsers' dynamic toolbar rather than the static
       * large viewport. `overscroll-contain` stops the panel's own
       * scroll from chaining into whatever the (locked) body would
       * otherwise do. */}
      {open &&
        createPortal(
          <div
            id={panelId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            style={{ top: "var(--header-h)", height: "calc(100dvh - var(--header-h))" }}
            className="fixed inset-x-0 z-(--z-mobile-nav) flex flex-col overflow-y-auto overscroll-contain border-t border-border-on-ink bg-ink px-6 py-6"
          >
            <div className="flex items-center gap-2 pb-6 font-heading text-body font-semibold text-paper-primary">
              <SkMark tone="on-ink" className="h-6" />
              {OWNER_NAME}
            </div>

            <nav className="flex flex-col items-start gap-1 border-t border-border-on-ink py-6" aria-label="Primary">
              {items.map((item) => (
                <NavLink key={item.href} href={item.href} className="text-headline-sm">
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex flex-col gap-3 border-t border-border-on-ink py-6">
              <Button href="/contact?intent=freelance_project" data-analytics-event="project_cta_click">
                Start a project
              </Button>
              <Button href="/contact?intent=hiring" variant="secondary-on-ink" data-analytics-event="recruiter_cta_click">
                Discuss a role
              </Button>
              <Button href="/resume" variant="ghost-on-ink" className="self-start" data-analytics-event="resume_view">
                View résumé →
              </Button>
            </div>

            <div className="mt-auto flex items-center justify-between gap-4 border-t border-border-on-ink pt-6">
              <a href={`mailto:${CONTACT_FALLBACKS.email}`} className="text-caption-sm text-paper-tertiary hover:text-paper-primary">
                {CONTACT_FALLBACKS.email}
              </a>
              <div className="flex items-center gap-4">
                <ExternalLink href={SOCIAL_LINKS.github} aria-label="GitHub" className="text-paper-tertiary hover:text-paper-primary" data-analytics-event="outbound_github">
                  <Icon.Github size={18} />
                </ExternalLink>
                <ExternalLink href={SOCIAL_LINKS.linkedin} aria-label="LinkedIn" className="text-paper-tertiary hover:text-paper-primary" data-analytics-event="outbound_linkedin">
                  <Icon.Linkedin size={18} />
                </ExternalLink>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
