import { Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ResumeAnalyzer } from "@/src/components/resume-analysis/resume-analyzer";
import { getSavedResumeAnalysisForCurrentUser } from "@/src/server/resume-builder/saved-analysis";

export default async function AiStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ analysis?: string }>;
}) {
  const { analysis: analysisId } = await searchParams;
  const savedAnalysis = analysisId
    ? await getSavedResumeAnalysisForCurrentUser(analysisId)
    : null;
  if (analysisId && !savedAnalysis) notFound();
  const analysisMode =
    (process.env.RESUME_ANALYSIS_PROVIDER ??
      (process.env.VERCEL ? "groq" : "ollama")) === "groq"
      ? "cloud"
      : "local";

  return (
    <div className="min-w-0 space-y-5">
      <section
        aria-labelledby="resume-analyzer-title"
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {analysisMode === "cloud" ? "Cloud AI" : "Local AI"}
        </div>
        <h1
          id="resume-analyzer-title"
          className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
        >
          Resume Analyzer
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Upload your resume for evidence-based feedback on content, impact,
          structure, ATS readiness, and likely OCR issues.
        </p>
        </div>
        <Link
          href="/resumes#analysis-history"
          className="inline-flex h-9 w-fit items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          View analysis history
        </Link>
      </section>

      <ResumeAnalyzer
        key={savedAnalysis?.id ?? "new-analysis"}
        analysisMode={analysisMode}
        initialAnalysis={savedAnalysis}
      />
    </div>
  );
}
