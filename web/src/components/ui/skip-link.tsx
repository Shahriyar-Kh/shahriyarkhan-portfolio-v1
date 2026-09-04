export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:border focus:border-ring focus:bg-background focus:px-4 focus:py-2 focus:text-body-sm focus:text-ink-primary"
    >
      Skip to content
    </a>
  );
}
