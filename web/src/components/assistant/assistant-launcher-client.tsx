"use client";

import dynamic from "next/dynamic";

// `next/dynamic` with `ssr: false` is only allowed from a Client
// Component (Next.js/Turbopack build-time restriction) - app/layout.tsx
// itself is a Server Component, so this one-line wrapper is what actually
// performs the lazy, client-only import; layout.tsx just renders it like
// any other component. See PORTFOLIO-ASSISTANTS-01 section 27.
export const AssistantLauncher = dynamic(
  () => import("@/components/assistant/assistant-launcher").then((mod) => mod.AssistantLauncher),
  { ssr: false },
);
