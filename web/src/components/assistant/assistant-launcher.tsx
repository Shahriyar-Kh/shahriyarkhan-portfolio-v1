"use client";

import dynamic from "next/dynamic";
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogBehavior } from "@/components/assistant/use-dialog-behavior";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ASSISTANT_LAUNCHER_LABEL } from "@/content/assistant";

type Mode = "closed" | "ask" | "discover";

const AssistantChat = dynamic(() => import("@/components/assistant/assistant-chat").then((mod) => mod.AssistantChat), { ssr: false });
const ProjectDiscoveryWizard = dynamic(
  () => import("@/components/assistant/project-discovery-wizard").then((mod) => mod.ProjectDiscoveryWizard),
  { ssr: false },
);

export function AssistantLauncher() {
  const [mode, setMode] = useState<Mode>("closed");
  const [discoverySeed, setDiscoverySeed] = useState("");
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = mode !== "closed";

  useDialogBehavior(open, () => setMode("closed"), panelRef);

  return (
    <>
      <button
        type="button"
        aria-label={ASSISTANT_LAUNCHER_LABEL}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setMode((current) => (current === "closed" ? "ask" : "closed"))}
        style={{ bottom: "max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))" }}
        className="fixed right-5 z-(--z-assistant) flex min-h-11 max-w-[calc(100vw-2.5rem)] items-center gap-2 overflow-hidden border border-border bg-primary px-4 py-3 text-body-sm font-medium whitespace-nowrap text-primary-foreground shadow-lg hover:opacity-90"
      >
        <Icon.MessageCircle size={18} className="shrink-0" aria-hidden />
        <span className="sm:hidden" aria-hidden="true">Ask</span>
        <span className="hidden sm:inline" aria-hidden="true">{ASSISTANT_LAUNCHER_LABEL}</span>
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
                    onClick={() => {
                      setDiscoverySeed("");
                      setMode("discover");
                    }}
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
                  <AssistantChat
                    onStartProject={(initialDescription) => {
                      setDiscoverySeed(initialDescription || "");
                      setMode("discover");
                    }}
                  />
                ) : (
                  <ProjectDiscoveryWizard
                    sourcePage={typeof window !== "undefined" ? window.location.pathname : "/"}
                    initialDescription={discoverySeed}
                  />
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
