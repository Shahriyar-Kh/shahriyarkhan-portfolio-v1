import { SectionIndex } from "@/components/motif/section-index";
import { Section } from "@/components/ui/section";
import { CLIENT_FAQ } from "@/content/home";

/**
 * Native <details>/<summary>, zero JS - the one section on the page
 * that's interactive without JavaScript.
 */
export function ClientFaq() {
  return (
    <Section shell="readable" className="border-t border-border">
      <SectionIndex n="10" label="Questions" className="mb-6" />
      <h2 className="text-display-sm text-ink-primary sm:text-display-md">Common questions</h2>

      <div className="mt-10 flex flex-col divide-y divide-border border-t border-b border-border">
        {CLIENT_FAQ.map((item) => (
          <details key={item.question} className="group rounded-md open:bg-paper-raised">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md px-4 py-5 text-body font-medium text-ink-primary marker:content-none hover:text-primary focus-visible:text-primary -mx-4">
              {item.question}
              {/* A real plus/minus, not a rotated "+": the vertical bar
               * scales away on open, leaving the horizontal bar as a
               * minus - the glyph itself communicates state, not just its
               * rotation. */}
              <span aria-hidden className="relative h-4 w-4 shrink-0 text-primary">
                <span className="absolute inset-0 m-auto h-0.5 w-4 bg-current" />
                <span className="absolute inset-0 m-auto h-4 w-0.5 bg-current transition-transform duration-(--motion-fast) ease-(--ease-out) group-open:scale-y-0" />
              </span>
            </summary>
            <p className="mt-1 max-w-2xl px-4 pb-5 text-body-sm text-ink-secondary">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
