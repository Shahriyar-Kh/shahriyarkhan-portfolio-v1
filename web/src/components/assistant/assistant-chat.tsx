"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { ASSISTANT_DISCLAIMER, ASSISTANT_STARTER_QUESTIONS } from "@/content/assistant";
import { postAssistantQuery } from "@/lib/api";
import type { AssistantQueryResponse, AssistantSource } from "@/lib/api/types";

interface ChatTurn {
  id: string;
  question: string;
  response: AssistantQueryResponse | null;
  errorMessage: string | null;
}

export interface AssistantChatProps {
  onStartProject: (initialDescription?: string) => void;
}

type SendState = "idle" | "sending";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceForRecommendation(sources: AssistantSource[], type: "project" | "service", slug: string) {
  return sources.find((source) => source.type === type && source.source_id === `${type}:${slug}`);
}

export function AssistantChat({ onStartProject }: AssistantChatProps) {
  const formId = useId();
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<SendState>("idle");

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || state === "sending") return;

    const turnId = crypto.randomUUID();
    const context = turns.slice(-4).map((turn) => turn.question);
    setTurns((prev) => [...prev, { id: turnId, question: trimmed, response: null, errorMessage: null }]);
    setDraft("");
    setState("sending");

    const result = await postAssistantQuery({
      message: trimmed,
      session_id: sessionIdRef.current,
      context,
    });

    setTurns((prev) =>
      prev.map((turn) =>
        turn.id === turnId
          ? result.ok
            ? { ...turn, response: result.data }
            : { ...turn, errorMessage: result.error.message }
          : turn,
      ),
    );
    setState("idle");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  return (
    <div className="flex h-full flex-col">
      <p className="border-b border-border px-4 py-3 text-caption-sm text-ink-hint">{ASSISTANT_DISCLAIMER}</p>

      <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {turns.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-body-sm text-ink-secondary">Try asking:</p>
            <div className="flex flex-col gap-2">
              {ASSISTANT_STARTER_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void send(question)}
                  className="border border-border px-3 py-2 text-left text-body-sm text-ink-primary transition-colors hover:border-primary/60 hover:bg-input"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-4">
          {turns.map((turn, turnIndex) => (
            <li key={turn.id} className="flex flex-col gap-2">
              <p className="max-w-[88%] self-end border border-border bg-input px-3 py-2 text-body-sm text-ink-primary">{turn.question}</p>

              {turn.errorMessage && (
                <p role="alert" className="border border-destructive px-3 py-2 text-caption-sm text-destructive">
                  {turn.errorMessage}
                </p>
              )}

              {!turn.errorMessage && !turn.response && (
                <p className="text-caption-sm text-ink-hint" role="status">
                  Thinking…
                </p>
              )}

              {turn.response && (
                <AssistantAnswer
                  response={turn.response}
                  onStartProject={() =>
                    onStartProject(
                      turns
                        .slice(Math.max(0, turnIndex - 3), turnIndex + 1)
                        .map((item) => item.question)
                        .join("\n"),
                    )
                  }
                  onAskProject={(title) => void send(`Tell me more about the ${title} project.`)}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border px-4 py-3">
        <label htmlFor={`${formId}-message`} className="sr-only">
          Ask a question about Shahriyar&apos;s portfolio
        </label>
        <Textarea
          id={`${formId}-message`}
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
        />
        <Button type="submit" disabled={state === "sending" || !draft.trim()} size="sm">
          {state === "sending" ? "Sending…" : "Ask"}
        </Button>
      </form>
    </div>
  );
}

function AssistantAnswer({
  response,
  onStartProject,
  onAskProject,
}: {
  response: AssistantQueryResponse;
  onStartProject: () => void;
  onAskProject: (title: string) => void;
}) {
  // Recommendations already expose their corresponding published source as
  // the primary case-study/service link. Do not repeat that exact same link
  // again inside the Sources disclosure: duplicate same-destination links
  // add visual noise and give assistive technology two indistinguishable
  // controls. Keep any additional evidence sources available below.
  const surfacedRecommendationIds = new Set([
    ...response.recommended_projects.map((slug) => `project:${slug}`),
    ...response.recommended_services.map((slug) => `service:${slug}`),
  ]);
  const additionalSources = response.sources.filter((source) => !surfacedRecommendationIds.has(source.source_id));

  return (
    <div className="flex flex-col gap-3 border border-border bg-paper-primary px-3 py-3">
      <p className="text-body-sm leading-relaxed text-ink-primary">{response.answer}</p>

      {response.recommended_projects.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-caption-sm font-medium uppercase tracking-wide text-ink-hint">Recommended work</p>
          <div className="flex flex-col gap-2">
            {response.recommended_projects.map((slug) => {
              const source = sourceForRecommendation(response.sources, "project", slug);
              const title = source?.title || titleFromSlug(slug);
              const href = source?.public_path || `/work/${slug}`;
              return (
                <div key={slug} className="border border-border bg-input/40 p-3">
                  <p className="text-body-sm font-medium text-ink-primary">{title}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    <Link href={href} className="inline-flex items-center gap-1 text-caption-sm font-medium text-primary hover:underline">
                      View case study <Icon.ArrowRight size={13} aria-hidden />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onAskProject(title)}
                      className="text-caption-sm font-medium text-ink-secondary hover:text-ink-primary hover:underline"
                    >
                      Ask about this project
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {response.recommended_services.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-caption-sm font-medium uppercase tracking-wide text-ink-hint">Relevant services</p>
          <div className="flex flex-wrap gap-2">
            {response.recommended_services.map((slug) => {
              const source = sourceForRecommendation(response.sources, "service", slug);
              const title = source?.title || titleFromSlug(slug);
              const href = source?.public_path || `/services/${slug}`;
              return (
                <Link key={slug} href={href} className="border border-border px-2.5 py-1.5 text-caption-sm text-ink-secondary hover:border-primary/60 hover:text-ink-primary">
                  {title}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {additionalSources.length > 0 && (
        <details className="border-t border-border pt-2">
          <summary className="cursor-pointer text-caption-sm text-ink-hint">Additional sources</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {additionalSources.map((source) =>
              source.public_path ? (
                <Link
                  key={source.source_id}
                  href={source.public_path}
                  className="border border-border px-2 py-1 text-caption-sm text-ink-secondary hover:border-primary/60 hover:text-ink-primary"
                >
                  {source.title}
                </Link>
              ) : (
                <span key={source.source_id} className="border border-border px-2 py-1 text-caption-sm text-ink-hint">
                  {source.title}
                </span>
              ),
            )}
          </div>
        </details>
      )}

      {response.handoff.active && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {response.handoff.reason === "project_discovery" ? (
            <Button type="button" size="sm" onClick={onStartProject}>
              Start a project
            </Button>
          ) : (
            <Button href="/contact" size="sm" variant="secondary">
              Contact Shahriyar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
