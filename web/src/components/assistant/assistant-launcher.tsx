"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { ProjectDiscoveryWizard } from "@/components/assistant/project-discovery-wizard";
import { useDialogBehavior } from "@/components/assistant/use-dialog-behavior";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ASSISTANT_LAUNCHER_LABEL } from "@/content/assistant";

type Mode = "closed" | "ask" | "discover";

export function AssistantLauncher() {
  const [mode, setMode] = useState<Mode>("closed");
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = mode !== "closed";

  // Portal target only exists client-side; avoids an SSR/CSR markup
  // mismatch without needing a separate `typeof window` branch at every
  // call site.
  if (!mounted && typeof window !== "undefined") setMounted(true);

  useDialogBehavior(open, () => setMode("closed"), panelRef);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setMode((current) => (current === "closed" ? "ask" : "closed"))}
        className="fixed bottom-5 right-5 z-(--z-mobile-nav) flex items-center gap-2 border border-border bg-primary px-4 py-3 text-body-sm font-medium text-primary-foreground shadow-lg hover:opacity-90"
      >
        <Icon.MessageCircle size={18} aria-hidden />
        {ASSISTANT_LAUNCHER_LABEL}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-(--z-mobile-nav) flex items-end justify-end bg-ink/40 p-0 sm:items-end sm:p-5">
            <div
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={mode === "discover" ? "Start a project" : "Ask about Shahriyar"}
              className="flex h-[85dvh] w-full flex-col border border-border bg-paper-primary shadow-xl sm:h-[32rem] sm:w-[26rem]"
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
