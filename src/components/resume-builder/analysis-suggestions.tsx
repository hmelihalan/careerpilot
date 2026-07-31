"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileInput,
  ScanSearch,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  previewResumeImprovement,
  type AppliedResumeImprovement,
} from "@/src/lib/resume-builder/apply-improvement";
import type { ResumeDocument } from "@/src/lib/resume-builder/schema";
import type { SavedResumeAnalysisView } from "@/src/types/resume-builder";

type BuilderSection =
  | "personal"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

const priorityStyles = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

function manualSection(category: string): BuilderSection {
  if (category === "skills" || category === "ats") return "skills";
  if (category === "education") return "education";
  if (category === "contact") return "personal";
  if (category === "experience" || category === "impact") return "experience";
  return "summary";
}

function resumeFacts(draft: ResumeDocument) {
  return [
    draft.contact.fullName || "No name",
    `${draft.experience.length} experience entries`,
    `${draft.education.length} education entries`,
    `${draft.skills.filter(Boolean).length} skills`,
  ];
}

export function AnalysisSuggestions({
  savedAnalysis,
  draft,
  imported,
  appliedIndexes,
  error,
  onImport,
  onApply,
  onOpenSection,
}: {
  savedAnalysis: SavedResumeAnalysisView;
  draft: ResumeDocument;
  imported: boolean;
  appliedIndexes: number[];
  error: string | null;
  onImport: () => void;
  onApply: (index: number, change: AppliedResumeImprovement) => void;
  onOpenSection: (section: BuilderSection) => void;
}) {
  const [reviewingImport, setReviewingImport] = useState(false);
  const { analysis, importedDraft } = savedAnalysis;

  return (
    <section className="overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm" aria-labelledby="analyzer-suggestions-title">
      <div className="flex flex-col gap-4 border-b border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ScanSearch className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="analyzer-suggestions-title" className="text-sm font-semibold text-slate-950">
              Resume Analyzer suggestions
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {savedAnalysis.fileName} · score {analysis.overallScore}/100 · {analysis.improvements.length} improvements
            </p>
          </div>
        </div>
        {imported ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <Check className="size-3.5" aria-hidden="true" /> Uploaded resume loaded
          </span>
        ) : importedDraft ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setReviewingImport((value) => !value)}>
            <FileInput aria-hidden="true" /> Review uploaded resume
          </Button>
        ) : (
          <span className="text-xs font-medium text-amber-700">Suggestions saved · automatic import unavailable</span>
        )}
      </div>

      {reviewingImport && importedDraft && !imported ? (
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Current builder draft</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {resumeFacts(draft).map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Uploaded resume</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {resumeFacts(importedDraft).map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setReviewingImport(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={() => { onImport(); setReviewingImport(false); }}>
              Replace with uploaded resume <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700" role="alert">
          <AlertCircle className="size-3.5" aria-hidden="true" /> {error}
        </div>
      ) : null}

      <div className="divide-y divide-slate-100">
        {analysis.improvements.map((item, index) => {
          const change = previewResumeImprovement(draft, item);
          const applied = appliedIndexes.includes(index);
          return (
            <article key={`${item.category}-${index}`} className={cn("p-4", applied && "bg-emerald-50/40")}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", priorityStyles[item.priority])}>{item.priority}</span>
                    <span className="text-xs font-medium capitalize text-slate-400">{item.category}</span>
                    {applied ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><Check className="size-3" aria-hidden="true" /> Applied</span> : null}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-950">{item.issue}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.recommendation}</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">Before</p>
                      <p className="mt-1 text-xs leading-5 text-slate-700">{change?.before ?? item.evidence}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Suggested</p>
                      <p className="mt-1 text-xs leading-5 text-slate-700">{change?.after || item.example || "Review this recommendation manually in the editor."}</p>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 lg:pt-6">
                  {change ? (
                    <Button type="button" size="sm" disabled={applied || !imported} onClick={() => onApply(index, change)} title={!imported ? "Load the uploaded resume first" : undefined}>
                      <Sparkles aria-hidden="true" /> {applied ? "Applied" : "Apply change"}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpenSection(manualSection(item.category))}>
                      Open editor <ArrowRight aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
