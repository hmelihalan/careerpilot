import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FilePenLine, Sparkles } from "lucide-react";

import { ResumeBuilder } from "@/src/components/resume-builder/resume-builder";
import { getResumeDraftForCurrentUser } from "@/src/server/resume-builder/get-resume-draft";
import { getSavedResumeAnalysisForCurrentUser } from "@/src/server/resume-builder/saved-analysis";

export default async function ResumeBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string; analysis?: string }>;
}) {
  const { resume: resumeId, analysis: analysisId } = await searchParams;
  const [currentResume, savedAnalysis] = await Promise.all([
    getResumeDraftForCurrentUser(resumeId),
    getSavedResumeAnalysisForCurrentUser(analysisId),
  ]);

  if (!currentResume || (analysisId && !savedAnalysis)) notFound();

  const aiMode =
    (process.env.RESUME_ANALYSIS_PROVIDER ??
      (process.env.VERCEL ? "groq" : "ollama")) === "groq"
      ? "cloud"
      : "local";

  return (
    <div className="min-w-0 space-y-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/resumes"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            All resumes
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            <FilePenLine className="size-3.5" aria-hidden="true" />
            Free ATS resume
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Resume Builder
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Build a clean resume, improve the wording with AI, and export it as
            a text-based PDF.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {aiMode === "cloud" ? "Cloud AI assistance" : "Local AI assistance"}
        </div>
      </section>

      <ResumeBuilder
        key={currentResume.id ?? "new-resume"}
        initialResumeId={currentResume.id}
        initialDraft={currentResume.draft}
        savedAnalysis={savedAnalysis}
      />
    </div>
  );
}
