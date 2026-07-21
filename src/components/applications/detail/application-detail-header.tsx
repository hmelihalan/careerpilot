import type { ReactNode } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Clock3,
  Ellipsis,
  MapPin,
  Pencil,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { applicationStatusBadgeStyles as statusStyles } from "@/src/constants/application-status";
import type { ApplicationStatus } from "@/src/types/application";

export type ApplicationHeaderData = {
  initials: string;
  role: string;
  company: string;
  status: ApplicationStatus;
  match?: number;
  location: string;
  workMode: string;
  dateLabel: string;
};

type ApplicationDetailHeaderProps = {
  application: ApplicationHeaderData;
  applicationsPath: string;
  demoMode?: boolean;
  deleteControl?: ReactNode;
  editControl?: ReactNode;
  statusControl?: ReactNode;
};

export function ApplicationDetailHeader({
  application,
  applicationsPath,
  demoMode = false,
  deleteControl,
  editControl,
  statusControl,
}: ApplicationDetailHeaderProps) {
  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <li>
            <Link href={applicationsPath} className="hover:text-indigo-700">
              Applications
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li className="truncate font-medium text-slate-700" aria-current="page">
            {application.role}
          </li>
        </ol>
      </nav>

      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-medium text-white">
              {application.initials}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-medium tracking-tight text-slate-950 sm:text-2xl">
                  {application.role}
                </h1>
                <Badge
                  className={cn(
                    "rounded-md px-2 font-medium",
                    statusStyles[application.status],
                  )}
                >
                  {application.status}
                </Badge>
                {application.match !== undefined ? (
                  <Badge className="rounded-md bg-indigo-50 px-2 font-medium text-indigo-700">
                    <Sparkles className="size-3" aria-hidden="true" />
                    {application.match}% AI match
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {application.company}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-slate-400" aria-hidden="true" />
                  {application.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <BriefcaseBusiness className="size-3.5 text-slate-400" aria-hidden="true" />
                  {application.workMode}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 className="size-3.5 text-slate-400" aria-hidden="true" />
                  {application.dateLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {editControl ?? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled
                  title={
                    demoMode
                      ? "Editing is unavailable in demo mode"
                      : "Editing is coming next"
                  }
                >
                  <Pencil data-icon="inline-start" aria-hidden="true" />
                  Edit
                </Button>
              )}
              {statusControl ?? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg"
                  disabled
                  title={
                    demoMode
                      ? "Status changes are unavailable in demo mode"
                      : "Status changes are coming next"
                  }
                >
                  Change Status
                  <ChevronDown data-icon="inline-end" aria-hidden="true" />
                </Button>
              )}
              {deleteControl ?? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled
                  title={
                    demoMode
                      ? "Actions are unavailable in demo mode"
                      : "More actions are coming next"
                  }
                >
                  <Ellipsis data-icon="inline-start" aria-hidden="true" />
                  More Actions
                </Button>
              )}
            </div>
            {demoMode ? (
              <p className="text-xs text-slate-500">
                Demo only — editing, status changes, and other actions are unavailable.
              </p>
            ) : null}
          </div>
        </div>
      </header>
    </div>
  );
}
