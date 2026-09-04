import { ConceptIcon } from "@/components/icons/concept-icons";
import { Reveal } from "@/components/layout/reveal";
import { SignalLine } from "@/components/motif/signal-line";
import { Button } from "@/components/ui/button";
import { DUAL_CTA_COPY } from "@/content/home";

/**
 * Section J - the dual conversion fork, its own full ink band so the two
 * paths - hiring vs. project - read as a deliberate decision point, not
 * another quiet text row. A short "Choose your path" label frames the
 * fork without gating anything - both panels and their CTAs are always
 * in the DOM and always reachable, never behind a modal or a click.
 *
 * FINAL-DESIGN-01A-R3: entrance is the shared `Reveal` primitive (a
 * "supporting section" per the R3 motion hierarchy), not a GSAP
 * ScrollTrigger slide-in - see services-capability.tsx's doc comment for
 * the same migration and why.
 */
export function DualCta() {
  return (
    <div className="surface-ink">
      <div className="section-shell py-16 sm:py-20">
        <p className="text-center font-mono text-label text-paper-hint uppercase">Choose your path</p>
        <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="border-t-2 border-primary-on-ink pt-6">
            <ConceptIcon.Credential size={22} className="text-primary-on-ink" />
            <p className="mt-3 font-mono text-label text-primary-on-ink uppercase">Recruiters &amp; hiring managers</p>
            <p className="mt-3 font-heading text-headline-lg text-paper-primary">{DUAL_CTA_COPY.hiring.title}</p>
            <p className="mt-3 max-w-sm text-body text-paper-tertiary">{DUAL_CTA_COPY.hiring.body}</p>
            <Button href={DUAL_CTA_COPY.hiring.cta.href} variant="secondary-on-ink" magnetic className="mt-6" data-analytics-event="recruiter_cta_click">
              {DUAL_CTA_COPY.hiring.cta.label}
            </Button>
          </Reveal>

          <Reveal delay={70} className="border-t-2 border-primary-on-ink pt-6">
            <ConceptIcon.ProjectLaunch size={22} className="text-primary-on-ink" />
            <p className="mt-3 font-mono text-label text-primary-on-ink uppercase">Founders &amp; clients</p>
            <p className="mt-3 font-heading text-headline-lg text-paper-primary">{DUAL_CTA_COPY.project.title}</p>
            <p className="mt-3 max-w-sm text-body text-paper-tertiary">{DUAL_CTA_COPY.project.body}</p>
            <Button href={DUAL_CTA_COPY.project.cta.href} variant="primary-on-ink" magnetic className="mt-6" data-analytics-event="project_cta_click">
              {DUAL_CTA_COPY.project.cta.label}
            </Button>
          </Reveal>
        </div>
      </div>
      <SignalLine variant="flow" className="h-10 w-full opacity-30" />
    </div>
  );
}
