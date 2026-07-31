"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Eye,
  Download,
  FilePenLine,
  FileSearch,
  GraduationCap,
  Lightbulb,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AnalysisSuggestions } from "@/src/components/resume-builder/analysis-suggestions";
import { OriginalPdfPreview } from "@/src/components/resume-builder/original-pdf-preview";
import { ResumePreview } from "@/src/components/resume-builder/resume-preview";
import type { AppliedResumeImprovement } from "@/src/lib/resume-builder/apply-improvement";
import type { ResumeDocument } from "@/src/lib/resume-builder/schema";
import type { SavedResumeAnalysisView } from "@/src/types/resume-builder";

type SectionId =
  | "personal"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

const sectionNavigation: Array<{
  id: SectionId;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: "personal", label: "Personal", icon: UserRound },
  { id: "summary", label: "Summary", icon: Lightbulb },
  { id: "experience", label: "Experience", icon: FilePenLine },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "projects", label: "Projects", icon: FilePenLine },
  { id: "certifications", label: "Certifications", icon: Check },
];

const inputClassName =
  "h-9 border-slate-200 bg-white text-sm shadow-none focus-visible:border-indigo-400 focus-visible:ring-indigo-100";

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function moveArrayItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function countResumeWords(draft: ResumeDocument): number {
  const text = [
    draft.contact.headline,
    draft.summary,
    ...draft.experience.flatMap((item) => [
      item.role,
      item.company,
      ...item.bullets,
    ]),
    ...draft.education.flatMap((item) => [
      item.degree,
      item.school,
      item.details,
    ]),
    ...draft.skills,
    ...draft.projects.flatMap((item) => [item.name, item.description]),
    ...draft.certifications.flatMap((item) => [item.name, item.issuer]),
  ].join(" ");

  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function EntryCard({
  title,
  onRemove,
  onMoveUp,
  onMoveDown,
  children,
}: {
  title: string;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="truncate text-sm font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            aria-label={`Move ${title} up`}
            title="Move up"
            className="text-slate-400"
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            aria-label={`Move ${title} down`}
            title="Move down"
            className="text-slate-400"
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Remove ${title}`}
            className="text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

export function ResumeBuilder({
  initialResumeId,
  initialDraft,
  savedAnalysis,
}: {
  initialResumeId: string | null;
  initialDraft: ResumeDocument;
  savedAnalysis: SavedResumeAnalysisView | null;
}) {
  const router = useRouter();
  const [resumeId, setResumeId] = useState(initialResumeId);
  const [draft, setDraft] = useState(initialDraft);
  const [activeSection, setActiveSection] = useState<SectionId>("personal");
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [aiState, setAiState] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "error">("idle");
  const [previewMode, setPreviewMode] = useState<"original" | "builder">(
    savedAnalysis?.hasOriginalPdf ? "original" : "builder",
  );
  const [analysisImported, setAnalysisImported] = useState(
    Boolean(savedAnalysis?.draftImportedAt),
  );
  const [appliedIndexes, setAppliedIndexes] = useState(
    savedAnalysis?.appliedImprovementIndexes ?? [],
  );
  const [analysisActionError, setAnalysisActionError] = useState<string | null>(null);
  const [lastAppliedChange, setLastAppliedChange] = useState<{
    draft: ResumeDocument;
    index: number;
  } | null>(null);
  const firstRender = useRef(true);
  const wordCount = countResumeWords(draft);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch("/api/resume-builder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId, draft }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Save failed");
        const result = (await response.json()) as { resumeId: string };
        if (!resumeId) {
          setResumeId(result.resumeId);
          router.replace(`/resume-builder?resume=${result.resumeId}`);
        }
        setSaveState("saved");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSaveState("error");
      }
    }, 800);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [draft, resumeId, router]);

  function updateContact(field: keyof ResumeDocument["contact"], value: string) {
    setDraft((current) => ({
      ...current,
      contact: { ...current.contact, [field]: value },
    }));
  }

  async function requestAiSuggestion(
    kind: "summary" | "experience",
    experienceId?: string,
  ) {
    const requestId = experienceId ?? kind;
    setAiState(requestId);
    setAiError(null);

    try {
      const response = await fetch("/api/resume-builder/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, draft, experienceId }),
      });
      const payload = (await response.json()) as {
        suggestions?: string[];
        error?: { message?: string };
      };
      if (!response.ok || !payload.suggestions?.length) {
        throw new Error(payload.error?.message ?? "AI suggestion failed.");
      }

      if (kind === "summary") {
        setDraft((current) => ({ ...current, summary: payload.suggestions![0] }));
      } else {
        setDraft((current) => ({
          ...current,
          experience: current.experience.map((entry) =>
            entry.id === experienceId
              ? { ...entry, bullets: payload.suggestions! }
              : entry,
          ),
        }));
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI suggestion failed.");
    } finally {
      setAiState(null);
    }
  }

  async function downloadPdf() {
    setPdfState("loading");
    try {
      const response = await fetch("/api/resume-builder/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? "The PDF could not be generated.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${draft.title || "resume"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPdfState("idle");
    } catch {
      setPdfState("error");
    }
  }

  async function updateSuggestionStatus(
    action: "import" | "apply" | "unapply",
    improvementIndex?: number,
  ) {
    if (!savedAnalysis) return;
    try {
      const response = await fetch("/api/resume-builder/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: savedAnalysis.id,
          action,
          improvementIndex,
        }),
      });
      if (!response.ok) throw new Error("Suggestion status could not be saved.");
      setAnalysisActionError(null);
    } catch {
      setAnalysisActionError(
        "The resume change was saved, but its suggestion status could not be updated.",
      );
    }
  }

  function importAnalyzedResume() {
    if (!savedAnalysis?.importedDraft) return;
    setDraft(savedAnalysis.importedDraft);
    setAnalysisImported(true);
    setLastAppliedChange(null);
    setActiveSection("personal");
    void updateSuggestionStatus("import");
  }

  function openEditorSection(section: SectionId) {
    setActiveSection(section);
    setMobileView("editor");
    window.requestAnimationFrame(() => {
      document
        .getElementById("resume-builder-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function applyAnalyzerChange(
    index: number,
    change: AppliedResumeImprovement,
  ) {
    setLastAppliedChange({ draft, index });
    setDraft(change.draft);
    setAppliedIndexes((current) => [...new Set([...current, index])]);
    setPreviewMode("builder");
    openEditorSection(change.section);
    void updateSuggestionStatus("apply", index);
  }

  function undoAnalyzerChange() {
    if (!lastAppliedChange) return;
    setDraft(lastAppliedChange.draft);
    setAppliedIndexes((current) =>
      current.filter((index) => index !== lastAppliedChange.index),
    );
    void updateSuggestionStatus("unapply", lastAppliedChange.index);
    setLastAppliedChange(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <Input
          aria-label="Resume title"
          value={draft.title}
          maxLength={120}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value || "Resume" }))
          }
          className="h-8 min-w-40 flex-1 border-transparent bg-slate-50 font-medium shadow-none sm:max-w-64"
        />
        <select
          aria-label="Resume language"
          value={draft.language}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              language: event.target.value as ResumeDocument["language"],
            }))
          }
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="en">English</option>
          <option value="tr">Türkçe</option>
        </select>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 px-1 text-xs font-medium",
            saveState === "error" ? "text-rose-600" : "text-slate-500",
          )}
          role="status"
        >
          {saveState === "saving" ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          ) : saveState === "saved" ? (
            <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
          ) : (
            <Save className="size-3.5" aria-hidden="true" />
          )}
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : "Could not save"}
        </span>
        <Button type="button" size="sm" onClick={downloadPdf} disabled={pdfState === "loading"}>
          {pdfState === "loading" ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {pdfState === "loading" ? "Preparing…" : "Download PDF"}
        </Button>
        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-0.5 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView("editor")}
            className={cn(
              "inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium",
              mobileView === "editor" && "bg-white text-slate-950 shadow-sm",
            )}
          >
            <FilePenLine className="size-3" aria-hidden="true" /> Editor
          </button>
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            className={cn(
              "inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium",
              mobileView === "preview" && "bg-white text-slate-950 shadow-sm",
            )}
          >
            <Eye className="size-3" aria-hidden="true" /> Preview
          </button>
        </div>
      </div>
      {pdfState === "error" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
          The PDF could not be generated. Please try again.
        </div>
      ) : null}
      {lastAppliedChange ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">
          <span>The Analyzer change was applied and will be autosaved.</span>
          <Button type="button" variant="ghost" size="xs" onClick={undoAnalyzerChange} className="text-emerald-800 hover:bg-emerald-100">
            <RotateCcw aria-hidden="true" /> Undo
          </Button>
        </div>
      ) : null}
      {savedAnalysis ? (
        <AnalysisSuggestions
          savedAnalysis={savedAnalysis}
          draft={draft}
          imported={analysisImported}
          appliedIndexes={appliedIndexes}
          error={analysisActionError}
          onImport={importAnalyzedResume}
          onApply={applyAnalyzerChange}
          onOpenSection={(section) => {
            openEditorSection(section);
          }}
        />
      ) : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(24rem,0.82fr)_minmax(32rem,1.18fr)]">
        <section
          id="resume-builder-editor"
          className={cn(
            "min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm",
            mobileView === "preview" && "hidden lg:block",
          )}
          aria-label="Resume editor"
        >
          <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-slate-200 p-2 lg:flex-wrap">
            {sectionNavigation.map((section) => {
              const Icon = section.icon;
              const selected = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100",
                    selected && "bg-indigo-50 text-indigo-700 hover:bg-indigo-50",
                  )}
                  aria-pressed={selected}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {section.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5">
            {aiError ? (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
                {aiError}
              </div>
            ) : null}
            {activeSection === "personal" ? (
              <div>
                <h2 className="text-base font-semibold text-slate-950">Personal details</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Add only contact details you want employers to see.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <FormField label="Full name" className="sm:col-span-2">
                    <Input className={inputClassName} value={draft.contact.fullName} maxLength={160} onChange={(event) => updateContact("fullName", event.target.value)} placeholder="Ada Lovelace" />
                  </FormField>
                  <FormField label="Professional headline" className="sm:col-span-2">
                    <Input className={inputClassName} value={draft.contact.headline} maxLength={160} onChange={(event) => updateContact("headline", event.target.value)} placeholder="Frontend Developer" />
                  </FormField>
                  <FormField label="Email">
                    <Input type="email" className={inputClassName} value={draft.contact.email} maxLength={254} onChange={(event) => updateContact("email", event.target.value)} placeholder="you@example.com" />
                  </FormField>
                  <FormField label="Phone">
                    <Input className={inputClassName} value={draft.contact.phone} maxLength={60} onChange={(event) => updateContact("phone", event.target.value)} placeholder="+90 5xx xxx xx xx" />
                  </FormField>
                  <FormField label="Location">
                    <Input className={inputClassName} value={draft.contact.location} maxLength={160} onChange={(event) => updateContact("location", event.target.value)} placeholder="Istanbul, Türkiye" />
                  </FormField>
                  <FormField label="LinkedIn">
                    <Input className={inputClassName} value={draft.contact.linkedin} maxLength={300} onChange={(event) => updateContact("linkedin", event.target.value)} placeholder="linkedin.com/in/username" />
                  </FormField>
                  <FormField label="Website" className="sm:col-span-2">
                    <Input className={inputClassName} value={draft.contact.website} maxLength={300} onChange={(event) => updateContact("website", event.target.value)} placeholder="portfolio.dev" />
                  </FormField>
                </div>
              </div>
            ) : null}

            {activeSection === "summary" ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-950">Professional summary</h2>
                  <Button type="button" variant="outline" size="sm" onClick={() => requestAiSuggestion("summary")} disabled={aiState !== null}>
                    {aiState === "summary" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                    Write with AI
                  </Button>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  In 3–4 lines, explain your experience, strongest skills, and the value you bring.
                </p>
                <FormField label="Summary" className="mt-5">
                  <Textarea
                    className="min-h-44 border-slate-200 bg-white text-sm leading-6 shadow-none focus-visible:border-indigo-400 focus-visible:ring-indigo-100"
                    value={draft.summary}
                    maxLength={2000}
                    onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="Example: Frontend developer with 3 years of experience building accessible React applications…"
                  />
                </FormField>
                <p className="mt-2 text-right text-[11px] text-slate-400">{draft.summary.length}/2000</p>
              </div>
            ) : null}

            {activeSection === "experience" ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Experience</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Lead with outcomes and concrete contributions.</p>
                  </div>
                  <Button type="button" size="sm" onClick={() => setDraft((current) => ({ ...current, experience: [...current.experience, { id: createId(), role: "", company: "", location: "", startDate: "", endDate: "", current: false, bullets: [""] }] }))}>
                    <Plus aria-hidden="true" /> Add
                  </Button>
                </div>
                <div className="mt-5 space-y-4">
                  {draft.experience.length === 0 ? <EmptyState label="No experience added yet." /> : null}
                  {draft.experience.map((item, index) => (
                    <EntryCard
                      key={item.id}
                      title={item.role || `Experience ${index + 1}`}
                      onMoveUp={index > 0 ? () => setDraft((current) => ({ ...current, experience: moveArrayItem(current.experience, index, index - 1) })) : undefined}
                      onMoveDown={index < draft.experience.length - 1 ? () => setDraft((current) => ({ ...current, experience: moveArrayItem(current.experience, index, index + 1) })) : undefined}
                      onRemove={() => setDraft((current) => ({ ...current, experience: current.experience.filter((entry) => entry.id !== item.id) }))}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(["role", "company", "location", "startDate", "endDate"] as const).map((field) => (
                          <FormField key={field} label={{ role: "Role", company: "Company", location: "Location", startDate: "Start date", endDate: "End date" }[field]} className={field === "role" || field === "company" ? "sm:col-span-2" : undefined}>
                            <Input disabled={field === "endDate" && item.current} className={inputClassName} value={item[field]} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, experience: current.experience.map((entry) => entry.id === item.id ? { ...entry, [field]: event.target.value } : entry) }))} placeholder={field === "startDate" ? "Jan 2023" : field === "endDate" ? "Dec 2025" : undefined} />
                          </FormField>
                        ))}
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-2">
                          <input type="checkbox" checked={item.current} onChange={(event) => setDraft((current) => ({ ...current, experience: current.experience.map((entry) => entry.id === item.id ? { ...entry, current: event.target.checked, endDate: event.target.checked ? "" : entry.endDate } : entry) }))} className="size-4 rounded border-slate-300 accent-indigo-600" />
                          I currently work here
                        </label>
                        <div className="flex items-center justify-between gap-3 sm:col-span-2">
                          <Label className="text-xs font-medium text-slate-700">Achievements (one bullet per line)</Label>
                          <Button type="button" variant="outline" size="xs" disabled={aiState !== null || !item.bullets.some((bullet) => bullet.trim())} onClick={() => requestAiSuggestion("experience", item.id)} title={item.bullets.some((bullet) => bullet.trim()) ? "Improve these bullets without inventing facts" : "Add rough notes first"}>
                            {aiState === item.id ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                            Improve with AI
                          </Button>
                        </div>
                        <FormField label="" className="sm:col-span-2">
                          <Textarea className="min-h-32 border-slate-200 bg-white text-sm leading-6 shadow-none focus-visible:border-indigo-400 focus-visible:ring-indigo-100" value={item.bullets.join("\n")} onChange={(event) => setDraft((current) => ({ ...current, experience: current.experience.map((entry) => entry.id === item.id ? { ...entry, bullets: event.target.value.split("\n").slice(0, 8) } : entry) }))} placeholder="Improved page load time by…&#10;Built and shipped…" />
                        </FormField>
                      </div>
                    </EntryCard>
                  ))}
                </div>
              </div>
            ) : null}

            {activeSection === "education" ? (
              <div>
                <SectionHeading title="Education" description="Add your most relevant education first." onAdd={() => setDraft((current) => ({ ...current, education: [...current.education, { id: createId(), school: "", degree: "", location: "", startDate: "", endDate: "", details: "" }] }))} />
                <div className="mt-5 space-y-4">
                  {draft.education.length === 0 ? <EmptyState label="No education added yet." /> : null}
                  {draft.education.map((item, index) => (
                    <EntryCard
                      key={item.id}
                      title={item.degree || `Education ${index + 1}`}
                      onMoveUp={index > 0 ? () => setDraft((current) => ({ ...current, education: moveArrayItem(current.education, index, index - 1) })) : undefined}
                      onMoveDown={index < draft.education.length - 1 ? () => setDraft((current) => ({ ...current, education: moveArrayItem(current.education, index, index + 1) })) : undefined}
                      onRemove={() => setDraft((current) => ({ ...current, education: current.education.filter((entry) => entry.id !== item.id) }))}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(["degree", "school", "location", "startDate", "endDate"] as const).map((field) => (
                          <FormField key={field} label={{ degree: "Degree / program", school: "School", location: "Location", startDate: "Start date", endDate: "End date" }[field]} className={field === "degree" || field === "school" ? "sm:col-span-2" : undefined}>
                            <Input className={inputClassName} value={item[field]} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, education: current.education.map((entry) => entry.id === item.id ? { ...entry, [field]: event.target.value } : entry) }))} />
                          </FormField>
                        ))}
                        <FormField label="Details" className="sm:col-span-2">
                          <Textarea className="min-h-24 border-slate-200 bg-white text-sm shadow-none" value={item.details} maxLength={2000} onChange={(event) => setDraft((current) => ({ ...current, education: current.education.map((entry) => entry.id === item.id ? { ...entry, details: event.target.value } : entry) }))} placeholder="Relevant coursework, honors, thesis…" />
                        </FormField>
                      </div>
                    </EntryCard>
                  ))}
                </div>
              </div>
            ) : null}

            {activeSection === "skills" ? (
              <div>
                <h2 className="text-base font-semibold text-slate-950">Skills</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Use job-relevant hard skills. Separate each skill with a comma.</p>
                <FormField label="Skills" className="mt-5">
                  <Textarea className="min-h-36 border-slate-200 bg-white text-sm leading-6 shadow-none" value={draft.skills.join(", ")} onChange={(event) => setDraft((current) => ({ ...current, skills: event.target.value.split(/,|\n/).map((skill) => skill.trim()).slice(0, 40) }))} placeholder="TypeScript, React, Next.js, PostgreSQL" />
                </FormField>
              </div>
            ) : null}

            {activeSection === "projects" ? (
              <div>
                <SectionHeading title="Projects" description="Show relevant personal, academic, or open-source work." onAdd={() => setDraft((current) => ({ ...current, projects: [...current.projects, { id: createId(), name: "", link: "", description: "" }] }))} />
                <div className="mt-5 space-y-4">
                  {draft.projects.length === 0 ? <EmptyState label="No projects added yet." /> : null}
                  {draft.projects.map((item, index) => (
                    <EntryCard
                      key={item.id}
                      title={item.name || `Project ${index + 1}`}
                      onMoveUp={index > 0 ? () => setDraft((current) => ({ ...current, projects: moveArrayItem(current.projects, index, index - 1) })) : undefined}
                      onMoveDown={index < draft.projects.length - 1 ? () => setDraft((current) => ({ ...current, projects: moveArrayItem(current.projects, index, index + 1) })) : undefined}
                      onRemove={() => setDraft((current) => ({ ...current, projects: current.projects.filter((entry) => entry.id !== item.id) }))}
                    >
                      <div className="space-y-4">
                        <FormField label="Project name"><Input className={inputClassName} value={item.name} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, projects: current.projects.map((entry) => entry.id === item.id ? { ...entry, name: event.target.value } : entry) }))} /></FormField>
                        <FormField label="Link"><Input className={inputClassName} value={item.link} maxLength={300} onChange={(event) => setDraft((current) => ({ ...current, projects: current.projects.map((entry) => entry.id === item.id ? { ...entry, link: event.target.value } : entry) }))} placeholder="github.com/username/project" /></FormField>
                        <FormField label="Description"><Textarea className="min-h-28 border-slate-200 bg-white text-sm leading-6 shadow-none" value={item.description} maxLength={2000} onChange={(event) => setDraft((current) => ({ ...current, projects: current.projects.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry) }))} placeholder="What you built, how you built it, and the outcome." /></FormField>
                      </div>
                    </EntryCard>
                  ))}
                </div>
              </div>
            ) : null}

            {activeSection === "certifications" ? (
              <div>
                <SectionHeading title="Certifications" description="Include credentials relevant to your target role." onAdd={() => setDraft((current) => ({ ...current, certifications: [...current.certifications, { id: createId(), name: "", issuer: "", date: "" }] }))} />
                <div className="mt-5 space-y-4">
                  {draft.certifications.length === 0 ? <EmptyState label="No certifications added yet." /> : null}
                  {draft.certifications.map((item, index) => (
                    <EntryCard
                      key={item.id}
                      title={item.name || `Certification ${index + 1}`}
                      onMoveUp={index > 0 ? () => setDraft((current) => ({ ...current, certifications: moveArrayItem(current.certifications, index, index - 1) })) : undefined}
                      onMoveDown={index < draft.certifications.length - 1 ? () => setDraft((current) => ({ ...current, certifications: moveArrayItem(current.certifications, index, index + 1) })) : undefined}
                      onRemove={() => setDraft((current) => ({ ...current, certifications: current.certifications.filter((entry) => entry.id !== item.id) }))}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(["name", "issuer", "date"] as const).map((field) => (
                          <FormField key={field} label={{ name: "Certification", issuer: "Issuer", date: "Date" }[field]} className={field === "name" ? "sm:col-span-2" : undefined}>
                            <Input className={inputClassName} value={item[field]} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, certifications: current.certifications.map((entry) => entry.id === item.id ? { ...entry, [field]: event.target.value } : entry) }))} />
                          </FormField>
                        ))}
                      </div>
                    </EntryCard>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section
          className={cn(
            "min-w-0 rounded-xl border border-slate-200 bg-slate-200/60 p-3 sm:p-5",
            mobileView === "editor" && "hidden lg:block",
          )}
          aria-label="Live ATS preview"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {previewMode === "original" ? "Original resume" : "Live ATS preview"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {previewMode === "original"
                  ? "Uploaded PDF · highlighted Analyzer evidence"
                  : "Roboto · 10.25 pt · single-column · selectable text"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {previewMode === "builder" ? (
                <span
                  className={cn(
                    "rounded-md border px-2 py-1 text-[10px] font-medium",
                    wordCount > 700
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-500",
                  )}
                  title="One page is a useful target for most early-career resumes; the exported PDF may use more pages when needed."
                >
                  {wordCount} words{wordCount > 700 ? " · review length" : ""}
                </span>
              ) : null}
              <ChevronDown className="size-4 text-slate-400 lg:hidden" aria-hidden="true" />
            </div>
          </div>
          {savedAnalysis?.hasOriginalPdf ? (
            <div className="mb-3 grid grid-cols-2 rounded-lg bg-slate-300/70 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode("original")}
                className={cn(
                  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-600",
                  previewMode === "original" && "bg-white text-slate-950 shadow-sm",
                )}
              >
                <FileSearch className="size-3.5" aria-hidden="true" /> Original PDF
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("builder")}
                className={cn(
                  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-600",
                  previewMode === "builder" && "bg-white text-slate-950 shadow-sm",
                )}
              >
                <Eye className="size-3.5" aria-hidden="true" /> Builder preview
              </button>
            </div>
          ) : null}
          <div className="scrollbar-thin max-h-[calc(100vh-10rem)] overflow-auto rounded-lg lg:sticky lg:top-20">
            {previewMode === "original" && savedAnalysis?.hasOriginalPdf ? (
              <OriginalPdfPreview
                analysisId={savedAnalysis.id}
                improvements={savedAnalysis.analysis.improvements}
              />
            ) : (
              <ResumePreview draft={draft} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-xs text-slate-500">
      {label}
    </div>
  );
}

function SectionHeading({
  title,
  description,
  onAdd,
}: {
  title: string;
  description: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <Button type="button" size="sm" onClick={onAdd}>
        <Plus aria-hidden="true" /> Add
      </Button>
    </div>
  );
}
