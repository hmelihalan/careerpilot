import Link from "next/link";
import { MapPin, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { applicationStatusBadgeStyles as statusStyles } from "@/src/constants/application-status";
import type { ApplicationListItem } from "@/src/types/application";

type ApplicationsListProps = {
  applications: readonly ApplicationListItem[];
  applicationsPath: string;
  onClearFilters: () => void;
};

export function ApplicationsList({
  applications,
  applicationsPath,
  onClearFilters,
}: ApplicationsListProps) {
  if (applications.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <SearchX className="size-4" aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-sm font-medium text-slate-900">
          No applications match your search and filters.
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onClearFilters}
        >
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-180 text-left text-xs">
          <thead>
            <tr className="border-b bg-slate-50/80 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-4 py-2.5">Company</th>
              <th scope="col" className="px-4 py-2.5">Role</th>
              <th scope="col" className="px-4 py-2.5">Status</th>
              <th scope="col" className="px-4 py-2.5">Location / Work Mode</th>
              <th scope="col" className="px-4 py-2.5">Match</th>
              <th scope="col" className="px-4 py-2.5">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((application) => (
              <tr
                key={application.id}
                className="group text-slate-600 transition-colors hover:bg-indigo-50/30 focus-within:bg-indigo-50/30"
              >
                <td className="p-0">
                  <Link
                    href={`${applicationsPath}/${application.slug}`}
                    aria-label={`View ${application.role} application at ${application.company}`}
                    className="flex items-center gap-2.5 rounded px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600 transition-colors group-hover:bg-indigo-50">
                      {application.initials}
                    </span>
                    <span className="font-medium text-slate-900 transition-colors group-hover:text-indigo-700">
                      {application.company}
                    </span>
                  </Link>
                </td>
                <td className="p-0">
                  <Link
                    href={`${applicationsPath}/${application.slug}`}
                    className="block rounded px-4 py-3 font-medium text-slate-800 transition-colors hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
                  >
                    {application.role}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn("rounded-md px-2 font-medium", statusStyles[application.status])}>
                    {application.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="block text-slate-700">{application.location}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {application.workMode ?? "Work mode not specified"}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {application.matchScore === null ? "—" : `${application.matchScore}%`}
                </td>
                <td className="px-4 py-3 text-slate-500">{application.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {applications.map((application) => (
          <article key={application.id} className="p-3">
            <Link
              href={`${applicationsPath}/${application.slug}`}
              className="group min-w-0 flex-1 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label={`View ${application.role} application at ${application.company}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600 group-hover:bg-indigo-50">
                  {application.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-medium text-slate-900 group-hover:text-indigo-700">
                      {application.role}
                    </h2>
                    <Badge className={cn("rounded-md px-2 font-medium", statusStyles[application.status])}>
                      {application.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{application.company}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden="true" />
                      {application.location}
                      {application.workMode ? ` · ${application.workMode}` : ""}
                    </span>
                    <span>
                      {application.matchScore === null
                        ? "Not scored"
                        : `${application.matchScore}% match`}
                    </span>
                    <span>Updated {application.updatedAt}</span>
                  </div>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
