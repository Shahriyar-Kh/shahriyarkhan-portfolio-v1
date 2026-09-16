"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ASSISTANT_DISCLAIMER, ASSISTANT_STARTER_QUESTIONS } from "@/content/assistant";
import { postAssistantQuery } from "@/lib/api";
import type { AssistantQueryResponse } from "@/lib/api/types";

interface ChatTurn {
  id: string;
  question: string;
  response: AssistantQueryResponse | null;
  errorMessage: string | null;
}

export interface AssistantChatProps {
  onStartProject: () => void;
}

type SendState = "idle" | "sending";

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
    setTurns((prev) => [...prev, { id: turnId, question: trimmed, response: null, errorMessage: null }]);
    setDraft("");
    setState("sending");

    const result = await postAssistantQuery({ message: trimmed, session_id: sessionIdRef.current });

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
                  className="border border-border px-3 py-2 text-left text-body-sm text-ink-primary hover:border-primary/60"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-4">
          {turns.map((turn) => (
            <li key={turn.id} className="flex flex-col gap-2">
              <p className="self-end border border-border bg-input px-3 py-2 text-body-sm text-ink-primary">{turn.question}</p>

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

              {turn.response && <AssistantAnswer response={turn.response} onStartProject={onStartProject} />}
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

function AssistantAnswer({ response, onStartProject }: { response: AssistantQueryResponse; onStartProject: () => void }) {
  return (
    <div className="flex flex-col gap-2 border border-border px-3 py-2">
      <p className="text-body-sm text-ink-primary">{response.answer}</p>

      {response.sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {response.sources.map((source) =>
            source.public_path ? (
              <a
                key={source.source_id}
                href={source.public_path}
                className="border border-border px-2 py-1 text-caption-sm text-ink-secondary hover:border-primary/60 hover:text-ink-primary"
              >
                View {source.type}: {source.title}
              </a>
            ) : (
              <span key={source.source_id} className="border border-border px-2 py-1 text-caption-sm text-ink-hint">
                {source.title}
              </span>
            ),
          )}
        </div>
      )}

      {response.handoff.active && (
        <div className="flex flex-wrap gap-2 pt-1">
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
