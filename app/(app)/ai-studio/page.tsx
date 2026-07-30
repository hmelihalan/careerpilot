import { Sparkles } from "lucide-react";

import { ResumeAnalyzer } from "@/src/components/resume-analysis/resume-analyzer";

export default function AiStudioPage() {
  const analysisMode =
    (process.env.RESUME_ANALYSIS_PROVIDER ??
      (process.env.VERCEL ? "groq" : "ollama")) === "groq"
      ? "cloud"
      : "local";

  return (
    <div className="min-w-0 space-y-5">
      <section aria-labelledby="resume-analyzer-title">
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
      </section>

      <ResumeAnalyzer analysisMode={analysisMode} />
    </div>
  );
}
