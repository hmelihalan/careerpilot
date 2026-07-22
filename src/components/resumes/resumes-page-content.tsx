import { FileText, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ResumeParseStatus } from "@/src/generated/prisma/enums";
import type { ResumeListItemViewModel } from "@/src/types/resume";

const parseStatusMeta = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700",
  },
  EXTRACTING: {
    label: "Extracting",
    className: "bg-blue-50 text-blue-700",
  },
  READY: {
    label: "Ready",
    className: "bg-emerald-50 text-emerald-700",
  },
  FAILED: {
    label: "Failed",
    className: "bg-rose-50 text-rose-700",
  },
  OCR_REQUIRED: {
    label: "OCR required",
    className: "bg-violet-50 text-violet-700",
  },
} as const satisfies Record<
  ResumeParseStatus,
  { label: string; className: string }
>;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1_024) return `${sizeBytes} B`;
  if (sizeBytes < 1_048_576) return `${(sizeBytes / 1_024).toFixed(1)} KB`;

  return `${(sizeBytes / 1_048_576).toFixed(1)} MB`;
}

type ResumesPageContentProps = {
  resumes: readonly ResumeListItemViewModel[];
};

export function ResumesPageContent({ resumes }: ResumesPageContentProps) {
  return (
    <div className="min-w-0 space-y-4">
      <section
        aria-labelledby="resumes-title"
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1
              id="resumes-title"
              className="text-xl font-medium tracking-tight text-slate-950 sm:text-2xl"
            >
              Resumes
            </h1>
            <Badge
              variant="secondary"
              className="rounded-md bg-slate-200/70 px-2 font-medium text-slate-600"
            >
              {resumes.length} total
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Manage tailored resume versions for your job applications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="rounded-md bg-indigo-50 px-2 font-medium text-indigo-700"
          >
            Upload coming next
          </Badge>
          <Button disabled>
            <Upload data-icon="inline-start" aria-hidden="true" />
            Upload resume
          </Button>
        </div>
      </section>

      {resumes.length === 0 ? (
        <Card className="border border-slate-200 shadow-none ring-0">
          <CardContent className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-sm font-medium text-slate-900">
              No resumes yet
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
              Upload and manage resumes, then connect them to job applications.
              File upload will be added in the next milestone.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {resumes.map((resume) => {
            const status = parseStatusMeta[resume.parseStatus];

            return (
              <Card
                key={resume.id}
                size="sm"
                className="border border-slate-200 shadow-none ring-0"
              >
                <CardContent className="space-y-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <FileText className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-medium text-slate-950">
                          {resume.name}
                        </h2>
                        {resume.isDefault ? (
                          <Badge className="rounded-md bg-indigo-600 px-2 text-white">
                            Default
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {resume.originalName}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`rounded-md px-2 font-medium ${status.className}`}
                    >
                      {status.label}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <dt className="text-slate-500">File size</dt>
                      <dd className="mt-0.5 font-medium text-slate-800">
                        {formatFileSize(resume.sizeBytes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">File type</dt>
                      <dd className="mt-0.5 font-medium text-slate-800">
                        {resume.mimeType}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Updated</dt>
                      <dd className="mt-0.5 font-medium text-slate-800">
                        {dateFormatter.format(new Date(resume.updatedAt))}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
