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
import { cn } from "@/lib/cn";
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
        <Button href={getResumeDownloadUrl("pdf")} size="lg" data-analytics-event="resume_download_pdf">
          <Icon.Download size={18} aria-hidden />
          Download PDF
        </Button>
      )}
      {downloads.docx && (
        <Button href={getResumeDownloadUrl("docx")} variant="secondary" size="lg" data-analytics-event="resume_download_docx">
          <Icon.Download size={18} aria-hidden />
          Download DOCX
        </Button>
      )}
    </div>
  );
}

/**
 * RESUME-UX-01: the same real download links as DownloadButtons above,
 * repeated at the end of the résumé preview so a visitor never has to
 * scroll back to the top to find them. Deliberately different accessible
 * names ("Download ATS Resume — PDF", not "Download PDF") so this can
 * never collide with the single-match `getByRole(..., { name: /download
 * pdf/i })` assertions the top buttons are tested with - both sets of
 * links point at the identical stable backend routes and carry the same
 * analytics events, since a click here is the same real action.
 */
function RepeatedDownloadCta({ downloads }: { downloads: ResumePageState["downloads"] }) {
  if (!downloads.pdf && !downloads.docx) return null;
  return (
    <div className="mt-10 flex flex-col gap-3 border-t border-border pt-8 sm:flex-row sm:flex-wrap">
      {downloads.pdf && (
        <Button href={getResumeDownloadUrl("pdf")} size="lg" data-analytics-event="resume_download_pdf">
          <Icon.Download size={18} aria-hidden />
          Download ATS Resume — PDF
        </Button>
      )}
      {downloads.docx && (
        <Button href={getResumeDownloadUrl("docx")} variant="secondary" size="lg" data-analytics-event="resume_download_docx">
          <Icon.Download size={18} aria-hidden />
          Download Editable Resume — DOCX
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
      {state.sections.map((section, index) => (
        <div key={section.key} className={cn("py-8 sm:py-10", index > 0 && "border-t border-border")}>
          <h2 className="text-label text-ink-tertiary uppercase tracking-wide">{section.heading}</h2>
          {section.key === "summary" ? (
            <div className="mt-4 flex max-w-2xl flex-col gap-3 text-body text-ink-secondary">
              {section.items.map((item, itemIndex) => (
                <p key={itemIndex} className="break-words">
                  <DocumentLine line={item} />
                </p>
              ))}
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className="break-words text-body-sm text-ink-secondary">
                  <DocumentLine line={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
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
  const sections = [
    state.skills.length > 0,
    state.experiences.length > 0,
    state.projects.length > 0,
    state.education.length > 0,
    state.certifications.length > 0,
  ];
  const firstVisibleIndex = sections.indexOf(true);

  return (
    <>
      {state.skills.length > 0 && (
        <div className={cn("py-8 sm:py-10", firstVisibleIndex !== 0 && "border-t border-border")}>
          <h2 className="text-label text-ink-tertiary uppercase tracking-wide">Technical skills</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {state.skills.map((skill) => (
              <li key={skill.id}>
                <Badge>
                  {skill.name} · {SKILL_LEVEL_LABELS[skill.level]}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.experiences.length > 0 && (
        <div className={cn("py-8 sm:py-10", firstVisibleIndex !== 1 && "border-t border-border")}>
          <h2 className="text-label text-ink-tertiary uppercase tracking-wide">Professional experience</h2>
          <ol className="mt-4 flex flex-col gap-6 border-l border-border pl-6">
            {state.experiences.map((role) => (
              <li key={role.id} className="relative">
                <Node filled={role.current_role} className="absolute top-1.5 -left-[calc(1.5rem+3px)]" />
                <p className="break-words text-body font-medium text-ink-primary">
                  {role.role_title} — {role.company_name}
                </p>
                <Tick className="mt-1">{formatDateRange(role.start_date, role.end_date, role.current_role)}</Tick>
              </li>
            ))}
          </ol>
        </div>
      )}

      {state.projects.length > 0 && (
        <div className={cn("py-8 sm:py-10", firstVisibleIndex !== 2 && "border-t border-border")}>
          <h2 className="text-label text-ink-tertiary uppercase tracking-wide">Selected projects</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {state.projects.map((project) => (
              <li key={project.id}>
                <Link href={`/work/${project.slug}`} className="break-words text-body-sm text-primary hover:underline">
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.education.length > 0 && (
        <div className={cn("py-8 sm:py-10", firstVisibleIndex !== 3 && "border-t border-border")}>
          <h2 className="text-label text-ink-tertiary uppercase tracking-wide">Education</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {state.education.map((item) => (
              <li key={item.id}>
                <p className="break-words text-body font-medium text-ink-primary">{item.degree}</p>
                <p className="break-words text-body-sm text-ink-secondary">{item.institution}</p>
                <Tick className="mt-1">
                  {formatMonthYear(item.start_date)} — {item.end_date ? formatMonthYear(item.end_date) : "Present"}
                </Tick>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.certifications.length > 0 && (
        <div className={cn("py-8 sm:py-10", firstVisibleIndex !== 4 && "border-t border-border")}>
          <h2 className="text-label text-ink-tertiary uppercase tracking-wide">Verified certifications</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {state.certifications.map((cert) => (
              <li key={cert.id}>
                <p className="break-words text-body font-medium text-ink-primary">
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
        </div>
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
      <Section shell="readable" className="pt-16 pb-4 sm:pt-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading as="h1" eyebrow="Master Resume" title={state.name} subtitle={state.professionalTitle || undefined} />
        </div>
        <p className="mt-3 max-w-2xl text-body-sm text-ink-hint">
          The current portfolio résumé — kept in sync with verified experience and optimized for applicant tracking
          systems.
        </p>

        <ContactRow state={state} />

        <div className="mt-6">
          <DownloadButtons downloads={state.downloads} />
        </div>

        {fallbackNotice(state)}
        <UnavailableNotice state={state} />
      </Section>

      <Section shell="readable" className="pt-4 pb-16 sm:pb-20">
        <div className="surface-elevated px-6 py-8 sm:px-10 sm:py-10">
          {state.usedFallback ? <FallbackResumeSections state={state} /> : <PublishedResumeSections state={state} />}
          <RepeatedDownloadCta downloads={state.downloads} />
        </div>

        {!state.usedFallback && (
          <p className="mt-8 text-body-sm text-ink-hint">
            Have a role in mind?{" "}
            <Link href="/contact" className="text-ink-primary hover:underline">
              Contact Shahriyar
            </Link>
            .
          </p>
        )}
      </Section>
    </>
  );
}
