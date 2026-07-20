import type { FormEvent } from "react";
import { FileText, Link2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ApplicationImportMethod } from "@/src/types/application";

type ImportApplicationStepProps = {
  method: ApplicationImportMethod;
  description: string;
  url: string;
  error?: string;
  onMethodChange: (method: ApplicationImportMethod) => void;
  onDescriptionChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onAnalyze: () => void;
  onManualEntry: () => void;
  onCancel: () => void;
};

export function ImportApplicationStep({
  method,
  description,
  url,
  error,
  onMethodChange,
  onDescriptionChange,
  onUrlChange,
  onAnalyze,
  onManualEntry,
  onCancel,
}: ImportApplicationStepProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAnalyze();
  }

  const errorId = `application-import-${method}-error`;
  const helpId = `application-import-${method}-help`;

  return (
    <form className="contents" onSubmit={handleSubmit} noValidate>
      <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 sm:px-6">
        <DialogTitle className="text-lg text-slate-950">Add Application</DialogTitle>
        <DialogDescription className="max-w-2xl leading-5 text-slate-500">
          Paste a job description or job URL and CareerPilot will extract the
          important details for you.
        </DialogDescription>
      </DialogHeader>

      <div className="scrollbar-thin min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-5">
          <div
            className="grid grid-cols-2 rounded-lg bg-slate-100 p-1"
            role="group"
            aria-label="Job import method"
          >
            <Button
              type="button"
              variant="ghost"
              aria-pressed={method === "description"}
              onClick={() => onMethodChange("description")}
              className={cn(
                "h-9 rounded-md text-slate-600 hover:bg-white",
                method === "description" &&
                  "bg-white text-indigo-700 shadow-sm hover:bg-white hover:text-indigo-700",
              )}
            >
              <FileText aria-hidden="true" />
              Job Description
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-pressed={method === "url"}
              onClick={() => onMethodChange("url")}
              className={cn(
                "h-9 rounded-md text-slate-600 hover:bg-white",
                method === "url" &&
                  "bg-white text-indigo-700 shadow-sm hover:bg-white hover:text-indigo-700",
              )}
            >
              <Link2 aria-hidden="true" />
              Job URL
            </Button>
          </div>

          {method === "description" ? (
            <div className="space-y-2">
              <Label htmlFor="job-description-import">Job Description</Label>
              <Textarea
                id="job-description-import"
                name="jobDescription"
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="Paste the complete listing here, including the role summary, responsibilities, qualifications, location, and company details..."
                rows={11}
                autoFocus
                aria-invalid={Boolean(error)}
                aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
                className="min-h-60 resize-y border-slate-200 bg-white leading-6"
              />
              <p id={helpId} className="text-xs leading-5 text-slate-500">
                We’ll detect the company, role, location, skills, and work type.
              </p>
              {error ? (
                <p id={errorId} className="text-xs font-medium text-red-600">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="job-url-import">Job URL</Label>
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
                  <Sparkles className="size-3" aria-hidden="true" />
                  Mock preview
                </span>
              </div>
              <Input
                id="job-url-import"
                name="jobUrl"
                type="url"
                value={url}
                onChange={(event) => onUrlChange(event.target.value)}
                placeholder="https://www.linkedin.com/jobs/view/..."
                autoFocus
                aria-invalid={Boolean(error)}
                aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
                className="h-10 border-slate-200 bg-white"
              />
              <p id={helpId} className="text-xs leading-5 text-slate-500">
                URL import support will be added for supported job platforms.
                For now, the URL will be saved as a reference and mock details
                will be shown for preview.
              </p>
              {error ? (
                <p id={errorId} className="text-xs font-medium text-red-600">
                  {error}
                </p>
              ) : null}
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={onManualEntry}
              className="rounded text-sm font-medium text-indigo-600 underline-offset-4 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Enter details manually
            </button>
          </div>
        </div>
      </div>

      <DialogFooter className="m-0 rounded-none bg-slate-50 px-5 py-3 sm:px-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Sparkles data-icon="inline-start" aria-hidden="true" />
          Analyze Job
        </Button>
      </DialogFooter>
    </form>
  );
}
