"use client";

import dynamic from "next/dynamic";
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogBehavior } from "@/components/assistant/use-dialog-behavior";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ASSISTANT_LAUNCHER_LABEL } from "@/content/assistant";

type Mode = "closed" | "ask" | "discover";

// PORTFOLIO-ASSISTANTS-02: the always-visible trigger button below is
// rendered directly and unconditionally - it must never depend on a lazy
// chunk load to exist. Only the two heavy, interaction-gated panels
// (chat, wizard) are code-split, and only AFTER the visitor has actually
// opened the dialog. This file itself is a Client Component ("use client"
// above), so `ssr: false` is allowed here per Next.js/Turbopack's rule
// (PA-01 section 27's original build failure was from putting `dynamic`
// with `ssr:false` in the Server Component layout.tsx instead).
//
// Root cause of the PA-02 visual-QA defect (launcher vanishing on
// mobile/tablet and never recovering, even back at desktop width): the
// ENTIRE launcher - including this trigger button - was previously
// wrapped in `dynamic(..., { ssr: false })` with no `loading` fallback and
// no retry. `next/dynamic` renders nothing while its chunk is loading and
// stays that way indefinitely if the fetch stalls or errors - since nothing
// in this component's always-rendered path (the button) touches any
// browser-only API during its first render, there was never a real reason
// to gate its own existence behind a lazy import at all.
const AssistantChat = dynamic(() => import("@/components/assistant/assistant-chat").then((mod) => mod.AssistantChat), { ssr: false });
const ProjectDiscoveryWizard = dynamic(
  () => import("@/components/assistant/project-discovery-wizard").then((mod) => mod.ProjectDiscoveryWizard),
  { ssr: false },
);

export function AssistantLauncher() {
  const [mode, setMode] = useState<Mode>("closed");
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = mode !== "closed";

  useDialogBehavior(open, () => setMode("closed"), panelRef);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setMode((current) => (current === "closed" ? "ask" : "closed"))}
        style={{ bottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
        className="fixed right-5 z-(--z-assistant) flex min-h-11 items-center gap-2 border border-border bg-primary px-4 py-3 text-body-sm font-medium text-primary-foreground shadow-lg hover:opacity-90"
      >
        <Icon.MessageCircle size={18} aria-hidden />
        {ASSISTANT_LAUNCHER_LABEL}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-(--z-assistant) flex items-end justify-end bg-ink/40 p-0 sm:items-end sm:p-5">
            <div
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={mode === "discover" ? "Start a project" : "Ask about Shahriyar"}
              className="flex h-[85dvh] w-full flex-col border border-border bg-paper-primary shadow-xl sm:h-[32rem] sm:w-[26rem]"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setMode("ask")}
                    aria-current={mode === "ask" || undefined}
                    className={`px-3 py-1.5 text-caption-sm font-medium ${mode === "ask" ? "border border-border bg-input text-ink-primary" : "text-ink-hint hover:text-ink-primary"}`}
                  >
                    Ask about Shahriyar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("discover")}
                    aria-current={mode === "discover" || undefined}
                    className={`px-3 py-1.5 text-caption-sm font-medium ${mode === "discover" ? "border border-border bg-input text-ink-primary" : "text-ink-hint hover:text-ink-primary"}`}
                  >
                    Start a project
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Close"
                  onClick={() => setMode("closed")}
                  className="px-2"
                >
                  <Icon.Close size={18} aria-hidden />
                </Button>
              </div>

              <div className="min-h-0 flex-1">
                {mode === "ask" ? (
                  <AssistantChat onStartProject={() => setMode("discover")} />
                ) : (
                  <ProjectDiscoveryWizard sourcePage={typeof window !== "undefined" ? window.location.pathname : "/"} />
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
