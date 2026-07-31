"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  FilePlus2,
  LoaderCircle,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ResumeListItem } from "@/src/types/resume-builder";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function ResumeDashboard({
  initialResumes,
}: {
  initialResumes: ResumeListItem[];
}) {
  const router = useRouter();
  const [resumes, setResumes] = useState(initialResumes);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createResume() {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/resumes", { method: "POST" });
      if (!response.ok) throw new Error("Create failed");
      const result = (await response.json()) as { resumeId: string };
      router.push(`/resume-builder?resume=${result.resumeId}`);
    } catch {
      setError("Your resume could not be created. Please try again.");
      setCreating(false);
    }
  }

  async function deleteResume(resume: ResumeListItem) {
    const confirmed = window.confirm(
      `Delete “${resume.title}”? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(resume.id);
    setError(null);

    try {
      const response = await fetch(`/api/resumes/${resume.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
      setResumes((current) => current.filter((item) => item.id !== resume.id));
      router.refresh();
    } catch {
      setError("Your resume could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="saved-resumes-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="saved-resumes-title" className="text-sm font-semibold text-slate-950">
            Saved resumes
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {resumes.length} {resumes.length === 1 ? "resume" : "resumes"} in your workspace
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={createResume}
          disabled={creating}
          className="w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto"
        >
          {creating ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {creating ? "Creating…" : "Create resume"}
        </Button>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {resumes.length === 0 ? (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <FilePlus2 className="size-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-950">
            Create your first resume
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            Start with an ATS-friendly layout, save automatically, and return
            to it from this page at any time.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={createResume}
            disabled={creating}
            className="mt-5 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {creating ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {creating ? "Creating…" : "Create resume"}
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {resumes.map((resume) => {
            const completion = Math.round(
              (resume.completedSections / resume.totalSections) * 100,
            );
            const isDeleting = deletingId === resume.id;

            return (
              <article
                key={resume.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <Link
                  href={`/resume-builder?resume=${resume.id}`}
                  aria-label={`Edit ${resume.title}`}
                  className="block bg-slate-100 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                >
                  <div className="mx-auto aspect-[0.77] max-h-56 overflow-hidden rounded-md border border-slate-200 bg-white px-5 py-6 shadow-sm transition group-hover:border-indigo-200">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900">
                          {resume.fullName || "Your name"}
                        </p>
                        <p className="mt-1 truncate text-[7px] text-slate-500">
                          {resume.headline || "Professional headline"}
                        </p>
                      </div>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[6px] font-bold uppercase text-slate-500">
                        {resume.language}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {["Profile", "Experience", "Education", "Skills"].map(
                        (section, index) => (
                          <div key={section}>
                            <p className="text-[6px] font-bold uppercase tracking-wider text-indigo-600">
                              {section}
                            </p>
                            <div className="mt-1 space-y-1">
                              <div className="h-1 rounded-full bg-slate-200" />
                              <div
                                className="h-1 rounded-full bg-slate-100"
                                style={{ width: `${82 - index * 9}%` }}
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </Link>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-950">
                        {resume.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Updated {formatUpdatedAt(resume.updatedAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${resume.title}`}
                      title="Delete resume"
                      disabled={isDeleting}
                      onClick={() => deleteResume(resume)}
                      className="text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      {isDeleting ? (
                        <LoaderCircle className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 aria-hidden="true" />
                      )}
                    </Button>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{completion}% complete</span>
                      <span>
                        {resume.completedSections}/{resume.totalSections} sections
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/resume-builder?resume=${resume.id}`}
                    className="mt-4 flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <PencilLine className="size-3.5" aria-hidden="true" />
                    Edit resume
                    <ArrowRight className="ml-auto mr-3 size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
