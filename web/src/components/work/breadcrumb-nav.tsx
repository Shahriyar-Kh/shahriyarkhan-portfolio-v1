import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbNavProps {
  items: readonly BreadcrumbItem[];
}

/**
 * FINAL-DESIGN-01C-02: the visual counterpart to lib/json-ld.ts's
 * breadcrumbSchema() - that function has always existed, but nothing
 * rendered a matching on-page `<nav>` until now. The last item (the
 * current page) is never a link, matching the schema's own semantics.
 */
export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 font-mono text-caption-sm text-ink-tertiary">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            {i > 0 && <Icon.ChevronRight size={12} aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink-primary">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-secondary">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
