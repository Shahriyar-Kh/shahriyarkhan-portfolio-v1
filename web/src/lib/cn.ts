/**
 * Minimal class-name joiner. Deliberately not clsx/tailwind-merge - this
 * app doesn't build class strings complex enough to need conflict
 * resolution, and one fewer dependency is one fewer thing to audit.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
