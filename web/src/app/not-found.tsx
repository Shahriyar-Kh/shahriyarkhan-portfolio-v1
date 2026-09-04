import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="section-shell flex min-h-[60vh] flex-col items-start justify-center gap-6 py-20">
      <p className="font-mono text-label text-accent">404</p>
      <h1 className="text-display-sm text-ink-primary">This page doesn&apos;t exist.</h1>
      <p className="max-w-md text-body text-ink-secondary">
        The page you&apos;re looking for isn&apos;t here. Try one of these instead.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button href="/">Home</Button>
        <Button href="/work" variant="secondary">
          Work
        </Button>
        <Button href="/contact" variant="ghost">
          Contact
        </Button>
      </div>
    </div>
  );
}
