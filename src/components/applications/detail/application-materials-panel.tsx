"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Save,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { InterviewQuestion } from "@/src/lib/application-materials/schema";
import type { ApplicationMaterialView } from "@/src/types/application";
import type { ResumeListItem } from "@/src/types/resume-builder";

type MaterialKind = "coverLetter" | "followUpMessage" | "interviewQuestions";

type ApplicationMaterialsPanelProps = {
  kind: MaterialKind;
  slug: string;
  company: string;
  role: string;
  hasJobDescription: boolean;
  resumes: readonly ResumeListItem[];
  material: ApplicationMaterialView | null;
};

const panelMeta = {
  coverLetter: {
    title: "Cover Letter",
    description: "A truthful, role-specific letter grounded in the selected resume.",
    icon: FileText,
  },
  followUpMessage: {
    title: "Follow-up Message",
    description: "A concise email to follow up after submitting this application.",
    icon: Mail,
  },
  interviewQuestions: {
    title: "Interview Prep",
    description: "Role-specific questions with guidance based on your real experience.",
    icon: MessageSquareText,
  },
} as const;

const categoryStyles = {
  Technical: "bg-indigo-50 text-indigo-700",
  Behavioral: "bg-sky-50 text-sky-700",
  "Company-Specific": "bg-violet-50 text-violet-700",
} as const;

const difficultyStyles = {
  Easy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Hard: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function questionsToText(questions: readonly InterviewQuestion[]): string {
  return questions
    .map(
      (item, index) =>
        `${index + 1}. [${item.category} · ${item.difficulty}] ${item.question}\nGuidance: ${item.guidance}`,
    )
    .join("\n\n");
}

export function ApplicationMaterialsPanel({
  kind,
  slug,
  company,
  role,
  hasJobDescription,
  resumes,
  material,
}: ApplicationMaterialsPanelProps) {
  const router = useRouter();
  const meta = panelMeta[kind];
  const Icon = meta.icon;
  const initialResumeId =
    material?.resumeDraftId && resumes.some((resume) => resume.id === material.resumeDraftId)
      ? material.resumeDraftId
      : (resumes[0]?.id ?? "");
  const [selectedResumeId, setSelectedResumeId] = useState(initialResumeId);
  const [text, setText] = useState(
    kind === "coverLetter"
      ? (material?.coverLetter ?? "")
      : kind === "followUpMessage"
        ? (material?.followUpMessage ?? "")
        : "",
  );
  const [questions, setQuestions] = useState<readonly InterviewQuestion[]>(
    material?.interviewQuestions ?? [],
  );
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const groupedQuestions = useMemo(
    () =>
      (["Technical", "Behavioral", "Company-Specific"] as const).map(
        (category) => ({
          category,
          questions: questions
            .map((question, index) => ({ question, index }))
            .filter(({ question }) => question.category === category),
        }),
      ),
    [questions],
  );

  async function handleGenerate() {
    if (!selectedResumeId || isGenerating) return;
    setError(undefined);
    setSaved(false);
    setIsGenerating(true);

    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(slug)}/materials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId: selectedResumeId }),
        },
      );
      const payload = (await response.json()) as {
        material?: ApplicationMaterialView;
        error?: { message?: string };
      };
      if (!response.ok || !payload.material) {
        throw new Error(payload.error?.message ?? "Application materials could not be generated.");
      }

      setText(
        kind === "coverLetter"
          ? payload.material.coverLetter
          : kind === "followUpMessage"
            ? payload.material.followUpMessage
            : "",
      );
      setQuestions(payload.material.interviewQuestions);
      setExpandedQuestions(new Set());
      setSaved(true);
      router.refresh();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Application materials could not be generated.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (kind === "interviewQuestions" || !text.trim() || isSaving) return;
    setError(undefined);
    setSaved(false);
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(slug)}/materials`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, content: text }),
        },
      );
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Changes could not be saved.");
      }
      setSaved(true);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Changes could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopy() {
    const content = kind === "interviewQuestions" ? questionsToText(questions) : text;
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setError("The content could not be copied. Select it and copy manually.");
    }
  }

  const hasContent =
    kind === "interviewQuestions" ? questions.length > 0 : Boolean(text.trim());

  return (
    <Card size="sm" className="border border-slate-200 bg-white shadow-none ring-0">
      <CardHeader className="gap-4 border-b border-slate-100 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>{meta.title}</CardTitle>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {meta.description} Target: {role} at {company}.
            </p>
            {material ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Generated from {material.resumeTitle} · {formatUpdatedAt(material.updatedAt)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          {resumes.length > 0 ? (
            <label className="min-w-0 sm:min-w-56">
              <span className="sr-only">Resume used for generation</span>
              <select
                value={selectedResumeId}
                onChange={(event) => setSelectedResumeId(event.target.value)}
                disabled={isGenerating}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              >
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.title}{resume.headline ? ` · ${resume.headline}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={!selectedResumeId || !hasJobDescription || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {isGenerating ? "Generating…" : hasContent ? "Regenerate all" : "Generate all"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {!hasJobDescription ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            Add the job description from the Overview edit action before generating materials.
          </div>
        ) : null}
        {resumes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-900">Create a resume first</p>
            <p className="mt-1 text-xs text-slate-500">Application materials need a saved resume as their factual source.</p>
            <Button render={<Link href="/resume-builder" />} size="sm" className="mt-4">
              Open Resume Builder
            </Button>
          </div>
        ) : hasContent ? (
          kind === "interviewQuestions" ? (
            <div className="space-y-5">
              {groupedQuestions.map((group) => (
                <section key={group.category} aria-labelledby={`generated-${group.category}`}>
                  <h3 id={`generated-${group.category}`} className="text-sm font-medium text-slate-900">
                    {group.category} Questions
                  </h3>
                  <div className="mt-2.5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.questions.map(({ question, index }) => {
                      const expanded = expandedQuestions.has(index);
                      return (
                        <article key={`${question.question}-${index}`} className="flex min-h-40 flex-col rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("rounded-md px-2 text-[10px] font-medium", categoryStyles[question.category])}>{question.category}</Badge>
                            <Badge variant="outline" className={cn("rounded-md px-2 text-[10px] font-medium", difficultyStyles[question.difficulty])}>{question.difficulty}</Badge>
                          </div>
                          <p className="mt-3 text-sm font-medium leading-5 text-slate-900">{question.question}</p>
                          {expanded ? (
                            <div className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs leading-5 text-indigo-900">
                              <span className="font-medium">Answer guidance:</span> {question.guidance}
                            </div>
                          ) : null}
                          <Button type="button" variant="ghost" size="sm" className="mt-auto w-fit rounded-lg px-0 pt-3 text-indigo-600 hover:bg-transparent" onClick={() => setExpandedQuestions((current) => {
                            const next = new Set(current);
                            if (next.has(index)) next.delete(index); else next.add(index);
                            return next;
                          })}>
                            {expanded ? "Hide guidance" : "Show guidance"}
                            {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                          </Button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <Textarea
              aria-label={meta.title}
              value={text}
              onChange={(event) => { setText(event.target.value); setSaved(false); }}
              rows={kind === "coverLetter" ? 20 : 10}
              maxLength={6_000}
              className="min-h-64 resize-y bg-white text-sm leading-6"
            />
          )
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
            <Sparkles className="mx-auto size-5 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-900">No material generated yet</p>
            <p className="mt-1 text-xs text-slate-500">Select a resume and generate all three application materials together.</p>
          </div>
        )}

        {hasContent ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            {kind !== "interviewQuestions" ? (
              <Button type="button" size="sm" disabled={isSaving || !text.trim()} onClick={handleSave}>
                {isSaving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                {isSaving ? "Saving…" : saved ? "Saved" : "Save changes"}
              </Button>
            ) : null}
            <p className="text-[11px] text-slate-500 sm:ml-auto">
              AI output may need review. Generated content never adds unsupported facts by instruction.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
