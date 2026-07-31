"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeAnalysis } from "@/src/lib/resume-analysis/schema";

type AnalysisResponse = {
  analysis: ResumeAnalysis;
  metadata: {
    characterCount: number;
    fileName: string;
    model: string;
    provider: "groq" | "ollama";
    savedAnalysisId: string;
    builderReady: boolean;
  };
};

type ApiError = {
  error?: {
    message?: string;
  };
};

const priorityStyles = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

const sectionLabels = {
  contact: "Contact",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
} as const;

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="relative grid size-32 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#4f46e5 ${score * 3.6}deg, #e2e8f0 0deg)`,
      }}
      role="img"
      aria-label={`Resume score: ${score} out of 100`}
    >
      <div className="grid size-27 place-items-center rounded-full bg-white">
        <div className="text-center">
          <p className="text-3xl font-semibold tracking-tight text-slate-950">
            {score}
          </p>
          <p className="text-xs font-medium text-slate-500">out of 100</p>
        </div>
      </div>
    </div>
  );
}

export function ResumeAnalyzer({
  analysisMode,
}: {
  analysisMode: "cloud" | "local";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  function chooseFile(nextFile: File | undefined) {
    if (!nextFile) return;
    setFile(nextFile);
    setError(null);
    setResult(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function analyze() {
    if (!file) {
      setError("Choose a PDF or TXT resume first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await fetch("/api/resume-analysis", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as AnalysisResponse | ApiError;
      if (!response.ok || !("analysis" in payload)) {
        throw new Error(
          "error" in payload
            ? payload.error?.message
            : "The resume could not be analyzed.",
        );
      }
      setResult(payload);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "The resume could not be analyzed.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      <Card className="border border-slate-200 shadow-none ring-0">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div
            className={`flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
              isDragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-300 bg-slate-50/70"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
              {file ? (
                <FileText className="size-5" aria-hidden="true" />
              ) : (
                <UploadCloud className="size-5" aria-hidden="true" />
              )}
            </span>
            <h2 className="mt-4 text-sm font-semibold text-slate-950">
              {file ? file.name : "Drop your resume here"}
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              {file
                ? `${(file.size / 1024).toFixed(0)} KB · Ready for analysis`
                : "Upload a text-based PDF or TXT file up to 4 MB."}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
              aria-label="Choose a resume file"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isAnalyzing}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            >
              {file ? "Choose another file" : "Browse files"}
            </button>
          </div>

          <aside className="flex flex-col rounded-xl bg-slate-950 p-5 text-white">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-indigo-300">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold">Private by design</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {analysisMode === "cloud"
                ? "PDF uploads, structured analysis, and editable resume fields are saved privately to your account for highlighted Builder review. Raw extracted text is not saved; it is sent to the configured cloud AI for this request."
                : "PDF uploads, structured analysis, and editable resume fields are saved privately to your account for highlighted Builder review. Raw extracted text is not saved and processing uses your local Ollama model."}
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              {[
                "Structured, evidence-based feedback",
                "Original PDF available only to your signed-in account",
                "Saved to your account for Resume Builder",
                "No training dataset required",
                analysisMode === "cloud"
                  ? "Resume text is processed by the configured cloud AI"
                  : "No resume content sent to a cloud LLM",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={analyze}
              disabled={!file || isAnalyzing}
              className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Analyzing resume…
                </>
              ) : (
                <>
                  Analyze resume
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </button>
          </aside>
        </CardContent>
      </Card>

      {error ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Analysis could not be completed</p>
            <p className="mt-1 leading-5 text-rose-700">{error}</p>
          </div>
        </div>
      ) : null}

      {isAnalyzing ? (
        <Card className="border border-slate-200 shadow-none ring-0">
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <span className="relative flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ScanSearch className="size-6" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full bg-indigo-500 ring-4 ring-white" />
            </span>
            <h2 className="mt-5 text-base font-semibold text-slate-950">
              Reading structure, impact, and ATS readiness
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              The model is checking each section, grounding suggestions, and
              preparing an editable copy for Resume Builder.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <AnalysisResults result={result} onReset={reset} />
      ) : null}
    </div>
  );
}

function AnalysisResults({
  result,
  onReset,
}: {
  result: AnalysisResponse;
  onReset: () => void;
}) {
  const { analysis, metadata } = result;

  return (
    <section className="space-y-5" aria-labelledby="analysis-results-title">
      <Card className="border border-slate-200 shadow-none ring-0">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <ScoreRing score={analysis.overallScore} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-indigo-200 text-indigo-700">
                <Sparkles aria-hidden="true" />
                {metadata.provider === "groq"
                  ? "Cloud AI analysis"
                  : "Local AI analysis"}
              </Badge>
              <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                <CheckCircle2 aria-hidden="true" />
                {metadata.builderReady
                  ? "Saved and ready for Builder"
                  : "Suggestions saved"}
              </Badge>
              <span className="text-xs text-slate-400">
                {metadata.model} · {metadata.characterCount.toLocaleString()} characters
              </span>
            </div>
            <h2
              id="analysis-results-title"
              className="mt-3 text-xl font-semibold tracking-tight text-slate-950"
            >
              {analysis.profile.targetRole}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {analysis.summary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium capitalize text-slate-600">
                {analysis.profile.seniority} level
              </span>
              {analysis.profile.experienceYears !== null ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                  ~{analysis.profile.experienceYears} years experience
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Link
              href={`/resume-builder?analysis=${metadata.savedAnalysisId}`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Open in Resume Builder
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              New analysis
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(analysis.sectionScores).map(([section, detail]) => (
          <Card
            key={section}
            size="sm"
            className="border border-slate-200 shadow-none ring-0"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {sectionLabels[section as keyof typeof sectionLabels]}
                </p>
                <span className={`text-lg font-semibold ${scoreTone(detail.score)}`}>
                  {detail.score}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${detail.score}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {detail.feedback}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
        <Card className="border border-slate-200 shadow-none ring-0">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-indigo-600" aria-hidden="true" />
              Priority improvements
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {analysis.improvements.map((item, index) => (
              <article
                key={`${item.category}-${index}`}
                className="p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityStyles[item.priority]}`}
                  >
                    {item.priority}
                  </span>
                  <span className="text-xs font-medium capitalize text-slate-400">
                    {item.category}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-950">
                  {item.issue}
                </h3>
                <p className="mt-2 border-l-2 border-slate-200 pl-3 text-xs italic leading-5 text-slate-500">
                  “{item.evidence}”
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.recommendation}
                </p>
                {item.example ? (
                  <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                    <span className="font-semibold">Example:</span> {item.example}
                  </div>
                ) : null}
              </article>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border border-slate-200 shadow-none ring-0">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                Resume strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {analysis.strengths.map((strength) => (
                <article key={strength.title}>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {strength.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {strength.evidence}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    {strength.whyItMatters}
                  </p>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-none ring-0">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ScanSearch className="size-4 text-indigo-600" aria-hidden="true" />
                  ATS readiness
                </span>
                <span className={`text-lg ${scoreTone(analysis.ats.score)}`}>
                  {analysis.ats.score}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {analysis.ats.formattingWarnings.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Formatting checks
                  </p>
                  <ul className="mt-2 space-y-2">
                    {analysis.ats.formattingWarnings.map((warning) => (
                      <li
                        key={warning}
                        className="flex items-start gap-2 text-xs leading-5 text-slate-600"
                      >
                        <AlertCircle
                          className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                          aria-hidden="true"
                        />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Keywords to consider
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysis.ats.keywordSuggestions.length ? (
                    analysis.ats.keywordSuggestions.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
                      >
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">
                      No obvious keyword gaps detected.
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border border-slate-200 shadow-none ring-0">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-500" aria-hidden="true" />
              Extracted profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {Object.entries(analysis.extracted).map(([group, items]) => (
              <div key={group}>
                <p className="text-xs font-semibold capitalize text-slate-500">
                  {group}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.length ? (
                    items.map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Not detected</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-none ring-0">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <ScanSearch className="size-4 text-slate-500" aria-hidden="true" />
              OCR quality check
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {analysis.ocrWarnings.length ? (
              <div className="space-y-3">
                {analysis.ocrWarnings.map((warning, index) => (
                  <article
                    key={`${warning.sourceText}-${index}`}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                  >
                    <p className="text-xs text-amber-900">
                      <span className="font-semibold">{warning.sourceText}</span>
                      {" → "}
                      {warning.suggestedReading}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      {warning.reason}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                No high-confidence OCR issues were detected.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
