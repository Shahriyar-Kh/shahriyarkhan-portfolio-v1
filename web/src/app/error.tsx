"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="section-shell flex min-h-[60vh] flex-col items-start justify-center gap-6 py-20">
      <p className="font-mono text-label text-destructive">ERROR</p>
      <h1 className="text-display-sm text-ink-primary">Something went wrong.</h1>
      <p className="max-w-md text-body text-ink-secondary">
        This page hit an unexpected error. It has been logged. You can try again, or head back home.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="secondary">
          Home
        </Button>
      </div>
    </div>
  );
}
