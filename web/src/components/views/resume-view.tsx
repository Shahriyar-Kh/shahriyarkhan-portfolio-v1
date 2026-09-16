import type { Key, ReactNode } from "react";
import Link from "next/link";
import { Node } from "@/components/motif/node";
import { Tick } from "@/components/motif/tick";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { Icon } from "@/components/ui/icon";
import { Section } from "@/components/ui/section";
import { getResumeDownloadUrl } from "@/lib/api/resume";
import { SKILL_LEVEL_LABELS } from "@/lib/api/types";
import type { ResumeDocumentLine } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDateRange, formatMonthYear } from "@/lib/format";
import type { ResumePageState } from "@/lib/resume-page-state";

export interface ResumeViewProps {
  state: ResumePageState;
}

type HeroContactKind = "email" | "phone" | "location" | "github" | "linkedin" | "whatsapp" | "website";

interface HeroContactItem {
  kind: HeroContactKind;
  label: string;
  href?: string;
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

function DownloadButtons({ downloads, onInk = false }: { downloads: ResumePageState["downloads"]; onInk?: boolean }) {
  if (!downloads.pdf && !downloads.docx) return null;
  return (
    <div className="flex flex-wrap justify-center gap-3" aria-label="Resume downloads">
      {downloads.pdf && (
        <Button
          href={getResumeDownloadUrl("pdf")}
          size="lg"
          variant={onInk ? "primary-on-ink" : "primary"}
          data-analytics-event="resume_download_pdf"
        >
          <Icon.Download size={18} aria-hidden />
          Download PDF
        </Button>
      )}
      {downloads.docx && (
        <Button
          href={getResumeDownloadUrl("docx")}
          variant={onInk ? "secondary-on-ink" : "secondary"}
          size="lg"
          data-analytics-event="resume_download_docx"
        >
          <Icon.Download size={18} aria-hidden />
          Download DOCX
        </Button>
      )}
    </div>
  );
}

function UnavailableNotice({ state }: { state: ResumePageState }) {
  if (state.downloads.pdf || state.downloads.docx) return null;
  if (state.usedFallback) return null;
  return <p className="mt-5 text-caption-sm text-paper-tertiary">A downloadable résumé document is not available right now.</p>;
}

function contactLineText(line: ResumeDocumentLine) {
  return line.map((segment) => segment.text).join("").trim();
}

function contactKindFromHref(href: string): HeroContactKind {
  const lowered = href.toLowerCase();
  if (lowered.includes("github.com")) return "github";
  if (lowered.includes("linkedin.com")) return "linkedin";
  if (lowered.includes("wa.me") || lowered.includes("whatsapp")) return "whatsapp";
  return "website";
}

function heroContactItems(state: ResumePageState): HeroContactItem[] {
  if (state.usedFallback) {
    const items: HeroContactItem[] = [
      { kind: "email", label: state.contactEmail, href: `mailto:${state.contactEmail}` },
    ];
    if (state.contactLocation) items.push({ kind: "location", label: state.contactLocation });
    for (const link of state.contactLinks) {
      items.push({ kind: contactKindFromHref(link.href), label: link.label, href: link.href });
    }
    return items;
  }

  const items: HeroContactItem[] = [];
  const seen = new Set<string>();
  const add = (item: HeroContactItem) => {
    const key = `${item.kind}:${item.href ?? item.label}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      items.push(item);
    }
  };

  for (const line of state.contacts) {
    const linkedSegments = line.filter((segment) => Boolean(segment.href));
    if (linkedSegments.length > 0) {
      for (const segment of linkedSegments) {
        const href = segment.href!;
        const kind = contactKindFromHref(href);
        const label = kind === "github" ? "GitHub" : kind === "linkedin" ? "LinkedIn" : kind === "whatsapp" ? "WhatsApp" : "Portfolio";
        add({ kind, label, href });
      }
      continue;
    }

    const text = contactLineText(line);
    if (!text) continue;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      add({ kind: "email", label: text, href: `mailto:${text}` });
    } else if (/^\+?[\d\s().-]{7,}/.test(text)) {
      const dialable = text.replace(/[^+\d]/g, "");
      add({ kind: "phone", label: text, href: `tel:${dialable}` });
    } else {
      add({ kind: "location", label: text });
    }
  }

  return items;
}

function HeroContactIcon({ kind }: { kind: HeroContactKind }) {
  if (kind === "email") return <Icon.Mail size={16} aria-hidden />;
  if (kind === "phone") return <Icon.Phone size={16} aria-hidden />;
  if (kind === "location") return <Icon.MapPin size={16} aria-hidden />;
  if (kind === "github") return <Icon.Github size={16} aria-hidden />;
  if (kind === "linkedin") return <Icon.Linkedin size={16} aria-hidden />;
  if (kind === "whatsapp") return <Icon.MessageCircle size={16} aria-hidden />;
  return <Icon.ArrowUpRight size={16} aria-hidden />;
}

function HeroContacts({ state }: { state: ResumePageState }) {
  const items = heroContactItems(state);
  if (items.length === 0) return null;

  return (
    <ul className="mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-5 gap-y-3 text-caption-sm text-paper-secondary sm:text-body-sm">
      {items.map((item) => (
        <li key={`${item.kind}:${item.href ?? item.label}`}>
          {item.href ? (
            item.href.startsWith("http") ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 transition-colors hover:text-paper-primary"
              >
                <HeroContactIcon kind={item.kind} />
                <span>{item.label}</span>
              </a>
            ) : (
              <a href={item.href} className="inline-flex items-center gap-2 transition-colors hover:text-paper-primary">
                <HeroContactIcon kind={item.kind} />
                <span>{item.label}</span>
              </a>
            )
          ) : (
            <span className="inline-flex items-center gap-2">
              <HeroContactIcon kind={item.kind} />
              <span>{item.label}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the immutable published snapshot's `document` DTO - exactly the
 * words that were approved and exported, with only presentation changed
 * here. The document remains a conservative white, single-column surface
 * inside the branded portfolio page.
 */
function PublishedResumeSections({ state }: { state: Extract<ResumePageState, { source: "default_version" }> }) {
  return (
    <>
      {state.sections.map((section, index) => (
        <section key={section.key} className={cn("py-7 sm:py-8", index > 0 && "border-t border-border")}>
          <h2 className="font-mono text-caption-sm font-semibold uppercase tracking-[0.12em] text-primary">{section.heading}</h2>
          {section.key === "summary" ? (
            <div className="mt-3 flex max-w-3xl flex-col gap-3 text-body-sm leading-relaxed text-ink-secondary sm:text-body">
              {section.items.map((item, itemIndex) => (
                <p key={itemIndex} className="break-words">
                  <DocumentLine line={item} />
                </p>
              ))}
            </div>
          ) : (
            <ul className="mt-3 flex list-disc flex-col gap-2.5 pl-5 marker:text-primary/70">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className="break-words pl-1 text-body-sm leading-relaxed text-ink-secondary">
                  <DocumentLine line={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}

/**
 * No valid published default exists - composed from current live,
 * published portfolio records. This path remains visibly marked as a
 * fallback and never pretends to be the approved generated résumé.
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
        <section className={cn("py-7 sm:py-8", firstVisibleIndex !== 0 && "border-t border-border")}>
          <h2 className="font-mono text-caption-sm font-semibold uppercase tracking-[0.12em] text-primary">Technical skills</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {state.skills.map((skill) => (
              <li key={skill.id}>
                <Badge>
                  {skill.name} · {SKILL_LEVEL_LABELS[skill.level]}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.experiences.length > 0 && (
        <section className={cn("py-7 sm:py-8", firstVisibleIndex !== 1 && "border-t border-border")}>
          <h2 className="font-mono text-caption-sm font-semibold uppercase tracking-[0.12em] text-primary">Professional experience</h2>
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
        </section>
      )}

      {state.projects.length > 0 && (
        <section className={cn("py-7 sm:py-8", firstVisibleIndex !== 2 && "border-t border-border")}>
          <h2 className="font-mono text-caption-sm font-semibold uppercase tracking-[0.12em] text-primary">Selected projects</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {state.projects.map((project) => (
              <li key={project.id}>
                <Link href={`/work/${project.slug}`} className="inline-flex items-center gap-1 break-words text-body-sm font-medium text-primary hover:underline">
                  {project.title} <Icon.ArrowRight size={13} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.education.length > 0 && (
        <section className={cn("py-7 sm:py-8", firstVisibleIndex !== 3 && "border-t border-border")}>
          <h2 className="font-mono text-caption-sm font-semibold uppercase tracking-[0.12em] text-primary">Education</h2>
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
        </section>
      )}

      {state.certifications.length > 0 && (
        <section className={cn("py-7 sm:py-8", firstVisibleIndex !== 4 && "border-t border-border")}>
          <h2 className="font-mono text-caption-sm font-semibold uppercase tracking-[0.12em] text-primary">Verified certifications</h2>
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
        </section>
      )}
    </>
  );
}

function fallbackNotice(state: ResumePageState): ReactNode {
  if (!state.usedFallback) return null;
  return (
    <p className="mt-5 max-w-2xl text-caption-sm text-paper-tertiary">
      Composed from the live, published employment and education record below — not an approved generated résumé document.
    </p>
  );
}

/**
 * The web page has two deliberate layers: a concise branded portfolio
 * introduction and a restrained white résumé document. The approved
 * snapshot remains the only source for published résumé facts.
 */
export function ResumeView({ state }: ResumeViewProps) {
  return (
    <>
      <Section shell="readable" className="border-b border-border-on-ink bg-ink">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="font-mono text-label uppercase tracking-[0.12em] text-primary-on-ink">Resume</p>
          <h1 className="mt-3 break-words font-heading text-display-sm text-paper-primary sm:text-display-md">{state.name}</h1>
          {state.professionalTitle && <p className="mt-3 max-w-3xl text-body text-paper-secondary">{state.professionalTitle}</p>}
          <HeroContacts state={state} />
          <div className="mt-7">
            <DownloadButtons downloads={state.downloads} onInk />
          </div>
          {fallbackNotice(state)}
          <UnavailableNotice state={state} />
        </div>
      </Section>

      <Section shell="readable" className="bg-paper-primary">
        <div className="mb-5 border-b border-border pb-4">
          <p className="font-mono text-caption-sm uppercase tracking-[0.12em] text-ink-hint">Resume document</p>
          <h2 className="mt-1 font-heading text-headline-md text-ink-primary">Professional profile</h2>
        </div>

        <article className="border border-border bg-white px-5 py-7 shadow-md sm:px-9 sm:py-9" aria-label="Resume document preview">
          {state.usedFallback ? <FallbackResumeSections state={state} /> : <PublishedResumeSections state={state} />}
        </article>

        {!state.usedFallback && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <p className="max-w-2xl text-body-sm text-ink-hint">Reviewing for a role or project? The contact page is the fastest way to share the context.</p>
            <Button href="/contact?intent=hiring" variant="secondary" data-analytics-event="recruiter_cta_click">
              Discuss a role <Icon.ArrowRight size={14} aria-hidden />
            </Button>
          </div>
        )}
      </Section>
    </>
  );
}
