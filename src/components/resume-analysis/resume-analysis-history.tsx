"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Download,
  FileSearch,
  FileText,
  LoaderCircle,
  ScanSearch,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResumeAnalysisListItem } from "@/src/types/resume-builder";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function scoreStyle(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

export function ResumeAnalysisHistory({
  initialAnalyses,
}: {
  initialAnalyses: ResumeAnalysisListItem[];
}) {
  const router = useRouter();
  const [analyses, setAnalyses] = useState(initialAnalyses);
  const [deletingId, setDeletingId] = useState<string>();
  const [error, setError] = useState<string>();

  async function deleteAnalysis(analysis: ResumeAnalysisListItem) {
    if (
      !window.confirm(
        `Delete the saved analysis for “${analysis.fileName}”? The uploaded file and feedback will also be removed.`,
      )
    ) {
      return;
    }

    setDeletingId(analysis.id);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/resume-analyses/${encodeURIComponent(analysis.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Delete failed");
      setAnalyses((current) => current.filter((item) => item.id !== analysis.id));
      router.refresh();
    } catch {
      setError("The saved analysis could not be deleted. Please try again.");
    } finally {
      setDeletingId(undefined);
    }
  }

  return (
    <section id="analysis-history" className="space-y-4 scroll-mt-20" aria-labelledby="analysis-history-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="analysis-history-title" className="text-sm font-semibold text-slate-950">
            Uploaded resumes &amp; analysis history
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {analyses.length} saved {analyses.length === 1 ? "analysis" : "analyses"}; every upload is kept separately.
          </p>
        </div>
        <Button render={<Link href="/ai-studio" />} size="lg" variant="outline" className="w-full sm:w-auto">
          <ScanSearch aria-hidden="true" /> Analyze another resume
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {analyses.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <FileSearch className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-slate-950">No saved analyses yet</h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            Upload a PDF or TXT resume to save the original file and its complete analysis here.
          </p>
          <Button render={<Link href="/ai-studio" />} className="mt-5">
            <Sparkles aria-hidden="true" /> Open Resume Analyzer
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {analyses.map((analysis) => (
            <article key={analysis.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-950" title={analysis.fileName}>
                        {analysis.fileName}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">Analyzed {formatDate(analysis.createdAt)}</p>
                    </div>
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ${scoreStyle(analysis.overallScore)}`}>
                      {analysis.overallScore}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="rounded-md px-2 text-[10px]">
                      {analysis.provider === "groq" ? "Cloud AI" : analysis.provider === "ollama" ? "Local AI" : "Saved analysis"}
                    </Badge>
                    <Badge variant="outline" className="rounded-md px-2 text-[10px]">
                      {analysis.hasOriginalPdf ? "PDF" : "TXT"}
                    </Badge>
                    <Badge variant="outline" className="rounded-md px-2 text-[10px]">
                      {analysis.improvementCount} improvements
                    </Badge>
                    {analysis.builderReady ? (
                      <Badge className="rounded-md bg-emerald-50 px-2 text-[10px] text-emerald-700">Builder ready</Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
                <p className="text-xs font-medium text-slate-900">{analysis.targetRole}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{analysis.summary}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button render={<Link href={`/ai-studio?analysis=${encodeURIComponent(analysis.id)}`} />} size="sm">
                  View analysis <ArrowRight aria-hidden="true" />
                </Button>
                <Button render={<Link href={`/resume-builder?analysis=${encodeURIComponent(analysis.id)}`} />} size="sm" variant="outline">
                  Open in Builder
                </Button>
                {analysis.hasOriginalFile ? (
                  <Button render={<a href={`/api/resume-analysis/original?analysisId=${encodeURIComponent(analysis.id)}`} target="_blank" rel="noreferrer" />} size="sm" variant="ghost">
                    <Download aria-hidden="true" /> Original
                  </Button>
                ) : null}
                <Button type="button" size="icon-sm" variant="ghost" className="ml-auto text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete analysis for ${analysis.fileName}`} disabled={deletingId === analysis.id} onClick={() => deleteAnalysis(analysis)}>
                  {deletingId === analysis.id ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
