import type { ReactNode } from "react";

import type {
  ResumeDocument,
  ResumeLanguage,
} from "@/src/lib/resume-builder/schema";

const labels: Record<
  ResumeLanguage,
  Record<"summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "present", string>
> = {
  en: {
    summary: "Professional Summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    present: "Present",
  },
  tr: {
    summary: "Profesyonel Özet",
    experience: "Deneyim",
    education: "Eğitim",
    skills: "Yetkinlikler",
    projects: "Projeler",
    certifications: "Sertifikalar",
    present: "Devam Ediyor",
  },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="border-b border-slate-800 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-950">
        {title}
      </h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function toHref(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function ResumePreview({ draft }: { draft: ResumeDocument }) {
  const copy = labels[draft.language];
  const contact = [
    draft.contact.email,
    draft.contact.phone,
    draft.contact.location,
  ].filter(Boolean);
  const links = [draft.contact.linkedin, draft.contact.website].filter(Boolean);
  const hasContent =
    draft.summary ||
    draft.experience.length ||
    draft.education.length ||
    draft.skills.length ||
    draft.projects.length ||
    draft.certifications.length;

  return (
    <article
      id="resume-print-document"
      className="resume-print-document mx-auto aspect-[210/297] w-full max-w-190 overflow-hidden bg-white px-[7.5%] py-[7%] font-sans text-[11px] leading-[1.45] text-slate-800 shadow-sm ring-1 ring-slate-200"
      aria-label="Resume preview"
    >
      <header className="text-center">
        <h1 className="text-[24px] font-bold leading-tight tracking-[0.04em] text-slate-950">
          {draft.contact.fullName || "Your Name"}
        </h1>
        {draft.contact.headline ? (
          <p className="mt-1 text-[12px] font-medium text-slate-700">
            {draft.contact.headline}
          </p>
        ) : null}
        {contact.length ? (
          <p className="mt-2 flex flex-wrap justify-center gap-x-2 text-[9px] text-slate-600">
            {contact.map((item, index) => (
              <span key={item}>
                {index > 0 ? <span className="mr-2">•</span> : null}
                {item}
              </span>
            ))}
          </p>
        ) : null}
        {links.length ? (
          <p className="mt-1 flex flex-wrap justify-center gap-x-3 text-[9px] text-slate-600">
            {links.map((item) => (
              <a key={item} href={toHref(item)} className="underline underline-offset-2">
                {item.replace(/^https?:\/\//i, "")}
              </a>
            ))}
          </p>
        ) : null}
      </header>

      {!hasContent ? (
        <div className="mt-16 rounded border border-dashed border-slate-300 px-8 py-10 text-center text-[10px] text-slate-400">
          Your resume preview will appear here as you add content.
        </div>
      ) : null}

      {draft.summary ? (
        <Section title={copy.summary}>
          <p className="whitespace-pre-line">{draft.summary}</p>
        </Section>
      ) : null}

      {draft.experience.length ? (
        <Section title={copy.experience}>
          <div className="space-y-3.5">
            {draft.experience.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {item.role || "Role"}
                    </h3>
                    <p className="font-medium">
                      {[item.company, item.location].filter(Boolean).join(" · ") ||
                        "Company"}
                    </p>
                  </div>
                  <p className="shrink-0 text-[9px] text-slate-600">
                    {[item.startDate, item.current ? copy.present : item.endDate]
                      .filter(Boolean)
                      .join(" – ")}
                  </p>
                </div>
                {item.bullets.filter(Boolean).length ? (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                    {item.bullets.filter(Boolean).map((bullet, index) => (
                      <li key={`${item.id}-${index}`}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {draft.education.length ? (
        <Section title={copy.education}>
          <div className="space-y-3">
            {draft.education.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {item.degree || "Degree"}
                    </h3>
                    <p>{[item.school, item.location].filter(Boolean).join(" · ")}</p>
                  </div>
                  <p className="shrink-0 text-[9px] text-slate-600">
                    {[item.startDate, item.endDate].filter(Boolean).join(" – ")}
                  </p>
                </div>
                {item.details ? <p className="mt-1 whitespace-pre-line">{item.details}</p> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {draft.skills.filter(Boolean).length ? (
        <Section title={copy.skills}>
          <p>{draft.skills.filter(Boolean).join(" • ")}</p>
        </Section>
      ) : null}

      {draft.projects.length ? (
        <Section title={copy.projects}>
          <div className="space-y-3">
            {draft.projects.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <h3 className="font-bold text-slate-950">
                  {item.name || "Project"}
                  {item.link ? (
                    <>
                      {" · "}
                      <a href={toHref(item.link)} className="font-normal underline">
                        {item.link.replace(/^https?:\/\//i, "")}
                      </a>
                    </>
                  ) : null}
                </h3>
                {item.description ? (
                  <p className="mt-1 whitespace-pre-line">{item.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {draft.certifications.length ? (
        <Section title={copy.certifications}>
          <div className="space-y-1">
            {draft.certifications.map((item) => (
              <div key={item.id} className="flex justify-between gap-4">
                <p>
                  <span className="font-bold text-slate-950">{item.name || "Certification"}</span>
                  {item.issuer ? ` · ${item.issuer}` : ""}
                </p>
                <p className="shrink-0 text-[9px] text-slate-600">{item.date}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </article>
  );
}
