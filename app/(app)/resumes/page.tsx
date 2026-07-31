import { Files } from "lucide-react";

import { ResumeDashboard } from "@/src/components/resume-builder/resume-dashboard";
import { getResumeDraftsForCurrentUser } from "@/src/server/resume-builder/get-resume-drafts";

export default async function ResumesPage() {
  const resumes = await getResumeDraftsForCurrentUser();

  return (
    <div className="min-w-0 space-y-6">
      <section>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          <Files className="size-3.5" aria-hidden="true" />
          Resume workspace
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          My Resumes
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Create tailored resumes for different roles and continue editing any
          saved version whenever you need it.
        </p>
      </section>

      <ResumeDashboard initialResumes={resumes} />
    </div>
  );
}
