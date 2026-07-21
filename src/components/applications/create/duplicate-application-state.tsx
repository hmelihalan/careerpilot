import Link from "next/link";
import { Copy, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  DuplicateApplicationReason,
  DuplicateApplicationSummary,
} from "@/src/types/application";

type DuplicateApplicationStateProps = {
  duplicate: DuplicateApplicationSummary;
  duplicateReason: DuplicateApplicationReason;
  onAddAnyway: () => void;
  onCancel: () => void;
  onViewExisting: () => void;
};

export function DuplicateApplicationState({
  duplicate,
  duplicateReason,
  onAddAnyway,
  onCancel,
  onViewExisting,
}: DuplicateApplicationStateProps) {
  const message =
    duplicateReason === "url"
      ? "This job link already exists in your applications."
      : "An application with the same company, role, and location already exists.";

  return (
    <>
      <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 sm:px-6">
        <DialogTitle className="text-lg text-slate-950">
          Possible Duplicate
        </DialogTitle>
        <DialogDescription className="text-slate-500">
          Review the matching application before continuing.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-72 items-center justify-center overflow-y-auto px-5 py-8 sm:px-6">
        <div className="w-full max-w-lg">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200">
                <Copy className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-950">{message}</p>
                <div className="mt-3 rounded-lg border border-amber-200/80 bg-white p-3">
                  <p className="text-sm font-medium text-slate-900">
                    {duplicate.role}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {duplicate.company}
                  </p>
                  {duplicate.location ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {duplicate.location}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            You can open the existing application or create another record anyway.
          </p>
        </div>
      </div>

      <DialogFooter className="m-0 rounded-none bg-white px-4 py-3 sm:px-6">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Link
          href={`/applications/${duplicate.slug}`}
          onClick={onViewExisting}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          View existing application
        </Link>
        <Button type="button" onClick={onAddAnyway}>
          Add anyway
        </Button>
      </DialogFooter>
    </>
  );
}
