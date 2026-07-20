"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApplicationCard } from "@/src/components/applications/application-card";
import type { MockApplication } from "@/src/types/application";
import { useAddApplicationDialog } from "@/src/components/applications/create/add-application-dialog";

type KanbanColumnProps = {
  title: string;
  applications: readonly MockApplication[];
  applicationsPath: string;
  showFilteredEmptyState: boolean;
};

export function KanbanColumn({
  title,
  applications,
  applicationsPath,
  showFilteredEmptyState,
}: KanbanColumnProps) {
  const headingId = `kanban-${title.toLowerCase()}`;
  const { openAddApplicationDialog } = useAddApplicationDialog();

  return (
    <section
      className="min-h-80 min-w-0 rounded-xl border border-slate-200 bg-slate-100/70 p-2"
      aria-labelledby={headingId}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h2 id={headingId} className="min-w-0 truncate text-xs font-medium text-slate-700">
          {title}
        </h2>
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
          {applications.length}
        </span>
      </div>
      {applications.length > 0 ? (
        <div className="space-y-2">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              applicationsPath={applicationsPath}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 p-2 text-center">
          {showFilteredEmptyState ? (
            <p className="text-[11px] leading-4 text-slate-500">
              No matching applications
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg text-slate-500"
              onClick={openAddApplicationDialog}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Add application
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
