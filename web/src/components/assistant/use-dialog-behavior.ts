import { useEffect, useRef } from "react";

/**
 * Escape-to-close, Tab focus trap, and body scroll lock for a
 * portal-rendered dialog - the same technique as components/layout/
 * mobile-nav.tsx's panel, factored out here since the assistant launcher
 * needs the identical behavior for its own dialog and duplicating a
 * ~40-line effect would be worse than one shared hook. Simpler than
 * mobile-nav's version on purpose: no route-change scroll restoration is
 * needed here, since opening/closing this dialog never navigates.
 */
export function useDialogBehavior(open: boolean, onClose: () => void, panelRef: React.RefObject<HTMLElement | null>) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    panel?.querySelector<HTMLElement>("button, input, textarea")?.focus();

    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
