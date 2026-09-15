import type { Key, ReactNode } from "react";
import Link from "next/link";
import { Node } from "@/components/motif/node";
import { Tick } from "@/components/motif/tick";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { Icon } from "@/components/ui/icon";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { getResumeDownloadUrl } from "@/lib/api/resume";
import { SKILL_LEVEL_LABELS } from "@/lib/api/types";
import type { ResumeDocumentLine } from "@/lib/api/types";
import { formatDateRange, formatMonthYear } from "@/lib/format";
import type { ResumePageState } from "@/lib/resume-page-state";

export interface ResumeViewProps {
  state: ResumePageState;
}

function DocumentLine({ line }: { line: ResumeDocumentLine }) {
  return (
    <>
      {line.map((segment, index) =>
        segment.href ? (
          <ExternalLink key={index} href={segment.href} className="hover:underline">
            {segment.text}
          </ExternalLink>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function DownloadButtons({ downloads }: { downloads: ResumePageState["downloads"] }) {
  if (!downloads.pdf && !downloads.docx) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {downloads.pdf && (
        <Button href={getResumeDownloadUrl("pdf")} data-analytics-event="resume_download_pdf">
          <Icon.Download size={16} aria-hidden />
          Download PDF
        </Button>
      )}
      {downloads.docx && (
        <Button href={getResumeDownloadUrl("docx")} variant="secondary" data-analytics-event="resume_download_docx">
          <Icon.Download size={16} aria-hidden />
          Download DOCX
        </Button>
      )}
    </div>
  );
}

function UnavailableNotice({ state }: { state: ResumePageState }) {
  if (state.downloads.pdf || state.downloads.docx) return null;
  if (state.usedFallback) return null;
  return <p className="mt-4 text-caption-sm text-ink-hint">A downloadable résumé document is not available right now.</p>;
}

/**
 * Renders the immutable published snapshot's `document` DTO (B7-RC
 * correction 1) - name, professional title, contact lines, and sections
 * in exactly the order/heading normalize_resume() produced for the
 * PDF/DOCX (empty sections are already omitted server-side). No project
 * slugs, skill levels, or structured dates exist in this flat
 * presentation text - it is deliberately the same words the approved
 * documents contain, not a live-data-enriched view.
 */
function PublishedResumeSections({ state }: { state: Extract<ResumePageState, { source: "default_version" }> }) {
  return (
    <>
      {state.sections.map((section) => (
        <Section key={section.key} className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">{section.heading}</h2>
          {section.key === "summary" ? (
            <div className="mt-6 flex max-w-2xl flex-col gap-3 text-body text-ink-secondary">
              {section.items.map((item, index) => (
                <p key={index}>
                  <DocumentLine line={item} />
                </p>
              ))}
            </div>
          ) : (
            <ul className="mt-6 flex flex-col gap-2">
              {section.items.map((item, index) => (
                <li key={index} className="text-body-sm text-ink-secondary">
                  <DocumentLine line={item} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      ))}
    </>
  );
}

/**
 * No valid published default master exists - composed from the current
 * live, published portfolio lists (see resume-page-state.ts). Uses
 * structured project/skill/experience/education data (with real
 * project links and skill levels) since there is no approved snapshot
 * to defer to here.
 */
function FallbackResumeSections({ state }: { state: Extract<ResumePageState, { source: "composed_from_lists" }> }) {
  return (
    <>
      {state.skills.length > 0 && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">Technical skills</h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {state.skills.map((skill) => (
              <li key={skill.id}>
                <Badge>
                  {skill.name} · {SKILL_LEVEL_LABELS[skill.level]}
                </Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {state.experiences.length > 0 && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">Professional experience</h2>
          <ol className="mt-6 flex flex-col gap-6 border-l border-border pl-6">
            {state.experiences.map((role) => (
              <li key={role.id} className="relative">
                <Node filled={role.current_role} className="absolute top-1.5 -left-[calc(1.5rem+3px)]" />
                <p className="text-body font-medium text-ink-primary">
                  {role.role_title} — {role.company_name}
                </p>
                <Tick className="mt-1">{formatDateRange(role.start_date, role.end_date, role.current_role)}</Tick>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {state.projects.length > 0 && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">Selected projects</h2>
          <ul className="mt-6 flex flex-col gap-2">
            {state.projects.map((project) => (
              <li key={project.id}>
                <Link href={`/work/${project.slug}`} className="text-body-sm text-primary hover:underline">
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {state.education.length > 0 && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">Education</h2>
          <ul className="mt-6 flex flex-col gap-4">
            {state.education.map((item) => (
              <li key={item.id}>
                <p className="text-body font-medium text-ink-primary">{item.degree}</p>
                <p className="text-body-sm text-ink-secondary">{item.institution}</p>
                <Tick className="mt-1">
                  {formatMonthYear(item.start_date)} — {item.end_date ? formatMonthYear(item.end_date) : "Present"}
                </Tick>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {state.certifications.length > 0 && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">Verified certifications</h2>
          <ul className="mt-6 flex flex-col gap-4">
            {state.certifications.map((cert) => (
              <li key={cert.id}>
                <p className="text-body font-medium text-ink-primary">
                  {cert.credential_url ? (
                    <ExternalLink href={cert.credential_url} className="hover:underline">
                      {cert.name}
                    </ExternalLink>
                  ) : (
                    cert.name
                  )}
                </p>
                <p className="text-body-sm text-ink-secondary">{cert.issuer}</p>
                <Tick className="mt-1">
                  {formatMonthYear(cert.issue_date)}
                  {cert.expiry_date ? ` — ${formatMonthYear(cert.expiry_date)}` : ""}
                </Tick>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

function ContactRow({ state }: { state: ResumePageState }) {
  if (!state.usedFallback) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-ink-secondary">
        {state.contacts.map((line, index) => (
          <span key={index as Key}>
            <DocumentLine line={line} />
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-ink-secondary">
      <a href={`mailto:${state.contactEmail}`} className="hover:text-ink-primary">
        {state.contactEmail}
      </a>
      {state.contactLocation && <span>{state.contactLocation}</span>}
      {state.contactLinks.map((link) => (
        <ExternalLink key={link.label} href={link.href} className="hover:text-ink-primary">
          {link.label}
        </ExternalLink>
      ))}
    </div>
  );
}

function fallbackNotice(state: ResumePageState): ReactNode {
  if (!state.usedFallback) return null;
  return (
    <p className="mt-4 text-caption-sm text-ink-hint">
      Composed from the live, published employment and education record below - not an approved generated résumé
      document.
    </p>
  );
}

/**
 * B7-RC: when a valid published default master exists, every fact shown
 * comes from its immutable snapshot (state.source === "default_version"
 * - see resume-page-state.ts); live SiteSetting/portfolio edits made
 * after publish can never change it. Download buttons appear only when
 * the backend confirms a real, structurally valid artifact exists right
 * now, resolved by the same policy the download endpoint itself uses.
 * They are real native anchors to the stable backend route - no blob, no
 * manual tracking call (a successful GET is tracked server-side). The
 * old bundled static PDF is deliberately never linked here.
 */
export function ResumeView({ state }: ResumeViewProps) {
  return (
    <>
      <Section className="pt-16 pb-8 sm:pt-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading as="h1" eyebrow="Résumé" title={state.name} subtitle={state.professionalTitle || undefined} />
          <DownloadButtons downloads={state.downloads} />
        </div>

        <ContactRow state={state} />

        {fallbackNotice(state)}
        <UnavailableNotice state={state} />
      </Section>

      {state.usedFallback ? <FallbackResumeSections state={state} /> : <PublishedResumeSections state={state} />}
    </>
  );
}
