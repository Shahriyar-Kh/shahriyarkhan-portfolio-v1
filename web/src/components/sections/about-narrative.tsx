import Image from "next/image";
import { ImageReveal } from "@/components/motif/image-reveal";
import { SectionIndex } from "@/components/motif/section-index";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { ABOUT_CAREER_STORY, ABOUT_LANGUAGES } from "@/content/about";

/**
 * FINAL-DESIGN-01B-01 Section C - the full career narrative (both
 * ABOUT_CAREER_STORY paragraphs, not the homepage's single-paragraph
 * preview in professional-story.tsx). Portrait on the left this time
 * (professional-story.tsx puts it on the right) so the two pages read as
 * distinct compositions of the same real photo and copy, never a
 * reflowed duplicate.
 */
export function AboutNarrative() {
  return (
    <Section className="border-t border-border">
      <div className="grid gap-12 lg:grid-cols-[0.7fr_1fr] lg:items-start lg:gap-16">
        <ImageReveal className="mx-auto aspect-3/4 w-full max-w-sm rounded-sm bg-surface lg:mx-0">
          <Image
            src="/images/shary-photo.jpeg"
            alt="Shahriyar Khan at work"
            fill
            sizes="(min-width: 1024px) 24rem, 80vw"
            className="object-cover"
          />
        </ImageReveal>

        <div>
          <SectionIndex n="02" label="Career" className="mb-6" />
          <h2 className="max-w-xl text-display-sm text-ink-primary sm:text-display-md">The career story</h2>
          <div className="mt-6 flex flex-col gap-5">
            {ABOUT_CAREER_STORY.map((paragraph) => (
              <p key={paragraph} className="max-w-2xl text-body text-ink-secondary">
                {paragraph}
              </p>
            ))}
          </div>

          {ABOUT_LANGUAGES.length > 0 && (
            <div className="mt-8">
              <p className="font-mono text-caption-sm text-ink-hint uppercase">Languages</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {ABOUT_LANGUAGES.map((language) => (
                  <li key={language}>
                    <Badge>{language}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
