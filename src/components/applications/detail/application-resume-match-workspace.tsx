"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  FilePlus2,
  FileSearch,
  History,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SubmittedResumeVersionView } from "@/src/types/application";
import type { ResumeListItem } from "@/src/types/resume-builder";
import type { ApplicationResumeMatchView } from "@/src/types/resume-match";

type Decision = "accepted" | "rejected" | "pending";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{score}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full",
            score >= 80
              ? "bg-emerald-500"
              : score >= 60
                ? "bg-amber-500"
                : "bg-rose-500",
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function ApplicationResumeMatchWorkspace({
  slug,
  company,
  role,
  hasJobDescription,
  resumes,
  matches,
  submittedResume,
}: {
  slug: string;
  company: string;
  role: string;
  hasJobDescription: boolean;
  resumes: readonly ResumeListItem[];
  matches: readonly ApplicationResumeMatchView[];
  submittedResume: SubmittedResumeVersionView | null;
}) {
  const router = useRouter();
  const [selectedResumeId, setSelectedResumeId] = useState(resumes[0]?.id ?? "");
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [localMatches, setLocalMatches] = useState(matches);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedMatch =
    localMatches.find((match) => match.id === selectedMatchId) ?? localMatches[0];

  const decisions = useMemo(() => {
    if (!selectedMatch) return new Map<number, Decision>();
    const map = new Map<number, Decision>();
    selectedMatch.acceptedSuggestionIndexes.forEach((index) =>
      map.set(index, "accepted"),
    );
    selectedMatch.rejectedSuggestionIndexes.forEach((index) =>
      map.set(index, "rejected"),
    );
    return map;
  }, [selectedMatch]);

  async function generateMatch() {
    if (!selectedResumeId) return;
    setBusy("generate");
    setError(null);
    try {
      const response = await fetch(`/api/applications/${encodeURIComponent(slug)}/resume-matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: selectedResumeId }),
      });
      const payload = (await response.json()) as {
        matchId?: string;
        error?: { message?: string };
      };
      if (!response.ok || !payload.matchId) {
        throw new Error(payload.error?.message ?? "Resume match could not be generated.");
      }
      setSelectedMatchId(payload.matchId);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Resume match could not be generated.");
    } finally {
      setBusy(null);
    }
  }

  async function updateDecision(index: number, decision: Decision) {
    if (!selectedMatch) return;
    setBusy(`suggestion-${index}`);
    setError(null);
    try {
      const action =
        decision === "accepted" ? "accept" : decision === "rejected" ? "reject" : "reset";
      const response = await fetch(
        `/api/applications/${encodeURIComponent(slug)}/resume-matches/${encodeURIComponent(selectedMatch.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, suggestionIndex: index }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? "Suggestion decision could not be saved.");
      }
      setLocalMatches((current) =>
        current.map((match) => {
          if (match.id !== selectedMatch.id) return match;
          const accepted = new Set(match.acceptedSuggestionIndexes);
          const rejected = new Set(match.rejectedSuggestionIndexes);
          accepted.delete(index);
          rejected.delete(index);
          if (decision === "accepted") accepted.add(index);
          if (decision === "rejected") rejected.add(index);
          return {
            ...match,
            acceptedSuggestionIndexes: [...accepted],
            rejectedSuggestionIndexes: [...rejected],
            tailoredResumeDraftId: null,
          };
        }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Suggestion decision could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function createTailoredCopy() {
    if (!selectedMatch) return;
    setBusy("tailor");
    setError(null);
    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(slug)}/resume-matches/${encodeURIComponent(selectedMatch.id)}/tailored-resume`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        href?: string;
        error?: { message?: string };
      };
      if (!response.ok || !payload.href) {
        throw new Error(payload.error?.message ?? "Tailored resume could not be created.");
      }
      window.location.assign(payload.href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tailored resume could not be created.");
      setBusy(null);
    }
  }

  async function markSubmitted() {
    if (!selectedMatch) return;
    setBusy("submitted");
    setError(null);
    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(slug)}/resume-matches/${encodeURIComponent(selectedMatch.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_submitted",
            useTailoredResume: Boolean(selectedMatch.tailoredResumeDraftId),
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? "Submitted resume could not be saved.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Submitted resume could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card size="sm" className="border border-slate-200 shadow-none ring-0">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileSearch className="size-3.5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Resume Match</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                Compare a saved resume with {role} at {company}.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {submittedResume ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
              <span className="inline-flex items-center gap-2 font-medium">
                <FileCheck2 className="size-4" aria-hidden="true" />
                Submitted CV: {submittedResume.resumeTitle}
              </span>
              <span className="text-emerald-700">Frozen {formatDate(submittedResume.submittedAt)}</span>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={selectedResumeId}
              onChange={(event) => setSelectedResumeId(event.target.value)}
              disabled={busy !== null || resumes.length === 0}
              className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              aria-label="Resume to match"
            >
              {resumes.length === 0 ? <option value="">No saved resumes</option> : null}
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title}{resume.fullName ? ` — ${resume.fullName}` : ""}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={generateMatch}
              disabled={!selectedResumeId || !hasJobDescription || busy !== null}
            >
              {busy === "generate" ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              {busy === "generate" ? "Matching…" : "Run match"}
            </Button>
          </div>
          {!hasJobDescription ? (
            <p className="flex items-center gap-2 text-xs text-amber-700">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              Add the job description before running a resume match.
            </p>
          ) : resumes.length === 0 ? (
            <p className="text-xs text-slate-500">
              Create a resume in My Resumes before running a match.
            </p>
          ) : (
            <p className="text-[11px] leading-5 text-slate-400">
              Each run stores an immutable resume and job snapshot. Your original resume is never changed.
            </p>
          )}
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {localMatches.length > 1 ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <History className="size-3.5 text-slate-400" aria-hidden="true" />
          <label htmlFor="match-history" className="text-xs font-medium text-slate-600">
            Match history
          </label>
          <select
            id="match-history"
            value={selectedMatch?.id ?? ""}
            onChange={(event) => setSelectedMatchId(event.target.value)}
            className="ml-auto h-8 max-w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600"
          >
            {localMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.resumeTitle} · {match.result.overallScore}% · {formatDate(match.createdAt)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {selectedMatch ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
            <Card size="sm" className="border border-slate-200 shadow-none ring-0">
              <CardContent className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className={cn("flex size-20 shrink-0 items-center justify-center rounded-full border text-2xl font-bold", scoreTone(selectedMatch.result.overallScore))}>
                    {selectedMatch.result.overallScore}
                  </div>
                  <div className="min-w-0 pt-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{selectedMatch.resumeTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{selectedMatch.result.summary}</p>
                    <p className="mt-2 text-[10px] text-slate-400">
                      {selectedMatch.provider ?? "AI"} · {formatDate(selectedMatch.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Skills" score={selectedMatch.result.skillScore} />
                  <ScoreBar label="Responsibilities" score={selectedMatch.result.responsibilityScore} />
                  <ScoreBar label="Keywords" score={selectedMatch.result.keywordScore} />
                </div>
              </CardContent>
            </Card>

            <Card size="sm" className="border border-slate-200 shadow-none ring-0">
              <CardHeader className="border-b border-slate-100"><CardTitle>Skills and keywords</CardTitle></CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Matched</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedMatch.result.matchedSkills.length ? selectedMatch.result.matchedSkills.map((item) => (
                      <Badge key={item.skill} className="bg-emerald-50 text-emerald-700" title={item.evidence}>{item.skill}</Badge>
                    )) : <span className="text-xs text-slate-400">No supported matches found.</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-700">Missing</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedMatch.result.missingSkills.length ? selectedMatch.result.missingSkills.map((item) => (
                      <Badge key={item.skill} className="bg-rose-50 text-rose-700" title={item.reason}>{item.skill}</Badge>
                    )) : <span className="text-xs text-slate-400">No critical gaps identified.</span>}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-slate-700">Keyword coverage</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    <span className="font-medium text-emerald-700">Present:</span> {selectedMatch.result.matchedKeywords.join(", ") || "None"}
                    <br />
                    <span className="font-medium text-rose-700">Missing:</span> {selectedMatch.result.missingKeywords.join(", ") || "None"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card size="sm" className="border border-slate-200 shadow-none ring-0">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Responsibility evidence</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {selectedMatch.result.responsibilityMatches.map((item, index) => (
                <div key={`${item.requirement}-${index}`} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                  <p className="text-xs font-medium leading-5 text-slate-800">{item.requirement}</p>
                  <div className="flex items-start gap-2">
                    <Badge className={cn("mt-0.5 shrink-0 capitalize", item.level === "strong" ? "bg-emerald-50 text-emerald-700" : item.level === "partial" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700")}>{item.level}</Badge>
                    <p className="text-xs leading-5 text-slate-500">{item.evidence}</p>
                  </div>
                </div>
              ))}
              {selectedMatch.result.responsibilityMatches.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-400">No responsibility evidence was returned.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card size="sm" className="border border-slate-200 shadow-none ring-0">
            <CardHeader className="border-b border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Review tailoring suggestions</CardTitle>
                  <p className="mt-0.5 text-xs text-slate-500">Accept only changes that remain truthful to your experience.</p>
                </div>
                <span className="text-xs text-slate-500">{selectedMatch.acceptedSuggestionIndexes.length} accepted</span>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {selectedMatch.result.suggestions.map((suggestion, index) => {
                const decision = decisions.get(index) ?? "pending";
                return (
                  <article key={`${suggestion.title}-${index}`} className={cn("p-4", decision === "accepted" && "bg-emerald-50/40", decision === "rejected" && "bg-slate-50/70 opacity-75")}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="capitalize">{suggestion.category}</Badge>
                          {decision === "accepted" ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><Check className="size-3" /> Accepted</span> : decision === "rejected" ? <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><X className="size-3" /> Rejected</span> : <span className="inline-flex items-center gap-1 text-xs text-slate-400"><CircleDashed className="size-3" /> Pending</span>}
                        </div>
                        <h3 className="mt-2 text-sm font-semibold text-slate-950">{suggestion.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{suggestion.rationale}</p>
                        <p className="mt-2 text-[11px] leading-5 text-indigo-700"><span className="font-semibold">Evidence:</span> {suggestion.evidence}</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">Before</p>
                            <p className="mt-1 text-xs leading-5 text-slate-700">{suggestion.before || "Not listed in the skills section"}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Suggested</p>
                            <p className="mt-1 text-xs leading-5 text-slate-700">{suggestion.after}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 lg:pt-6">
                        {decision !== "pending" ? (
                          <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => updateDecision(index, "pending")}>
                            <RotateCcw aria-hidden="true" /> Reset
                          </Button>
                        ) : null}
                        <Button type="button" variant="outline" size="sm" disabled={busy !== null || decision === "rejected"} onClick={() => updateDecision(index, "rejected")}>
                          <X aria-hidden="true" /> Reject
                        </Button>
                        <Button type="button" size="sm" disabled={busy !== null || decision === "accepted"} onClick={() => updateDecision(index, "accepted")}>
                          {busy === `suggestion-${index}` ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />} Accept
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {selectedMatch.result.suggestions.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-400">No safe automatic rewrites were identified.</p>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Create a job-specific copy</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Only accepted, source-grounded changes are applied. The original CV stays untouched.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy !== null} onClick={markSubmitted}>
                {busy === "submitted" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />}
                Mark {selectedMatch.tailoredResumeDraftId ? "tailored" : "this"} CV as submitted
              </Button>
              {selectedMatch.tailoredResumeDraftId ? (
                <Link
                  href={`/resume-builder?resume=${encodeURIComponent(selectedMatch.tailoredResumeDraftId)}&match=${encodeURIComponent(selectedMatch.id)}`}
                  className={buttonVariants()}
                >
                  Open tailored copy <ArrowRight aria-hidden="true" />
                </Link>
              ) : (
                <Button type="button" disabled={selectedMatch.acceptedSuggestionIndexes.length === 0 || busy !== null} onClick={createTailoredCopy}>
                  {busy === "tailor" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
                  Create tailored copy
                </Button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto size-8 text-slate-300" aria-hidden="true" />
          <h3 className="mt-3 text-sm font-semibold text-slate-800">No resume match yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Choose a saved resume and run the first evidence-based comparison for this application.</p>
        </div>
      )}
    </div>
  );
}
