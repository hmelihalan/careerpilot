import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { applicationStatusBadgeStyles as statusStyles } from "@/src/constants/application-status";
import { getMockApplicationsBySlugs } from "@/src/constants/mock-applications";
import type { DashboardRecentApplication } from "@/src/types/dashboard";

const demoApplications = getMockApplicationsBySlugs([
  "kron-full-stack-intern",
  "insider-junior-web-developer",
  "atlassian-junior-engineer",
  "getir-junior-react-developer",
  "peak-frontend-intern",
]);

type RecentApplicationsProps =
  | {
      mode: "demo";
      applicationsPath: string;
      applications?: never;
    }
  | {
      mode?: "authenticated";
      applicationsPath: string;
      applications: readonly DashboardRecentApplication[];
    };

export function RecentApplications(props: RecentApplicationsProps) {
  const demoMode = props.mode === "demo";

  return (
    <Card size="sm" className="border border-slate-200 shadow-none ring-0">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Applications</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">
            Your latest application activity.
          </p>
        </div>
        <Link
          href={props.applicationsPath}
          className="rounded text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className={demoMode ? "px-0" : undefined}>
        {demoMode ? (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-170 text-left text-xs">
              <thead>
                <tr className="border-y bg-slate-50/80 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-2 first:pl-4 sm:first:pl-6">
                    Company
                  </th>
                  <th scope="col" className="px-4 py-2">Role</th>
                  <th scope="col" className="px-4 py-2">Status</th>
                  <th scope="col" className="px-4 py-2">Match</th>
                  <th scope="col" className="px-4 py-2 last:pr-4 sm:last:pr-6">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demoApplications.map((application) => (
                  <tr
                    key={application.id}
                    className="group text-slate-600 transition-colors hover:bg-indigo-50/30 focus-within:bg-indigo-50/30"
                  >
                    <td className="px-4 py-2.5 first:pl-4 sm:first:pl-6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600">
                          {application.initials}
                        </span>
                        <span className="font-medium text-slate-900">
                          {application.company}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`${props.applicationsPath}/${application.slug}`}
                        className="rounded font-medium text-slate-700 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      >
                        {application.role}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        className={cn(
                          "rounded-md px-2 font-medium",
                          statusStyles[application.status],
                        )}
                      >
                        {application.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {application.matchScore}%
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 last:pr-4 sm:last:pr-6">
                      {application.appliedDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : props.applications.length > 0 ? (
          <div className="scrollbar-thin -mx-4 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-170 text-left text-xs">
              <thead>
                <tr className="border-y bg-slate-50/80 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-2 first:pl-4 sm:first:pl-6">
                    Company
                  </th>
                  <th scope="col" className="px-4 py-2">Role</th>
                  <th scope="col" className="px-4 py-2">Status</th>
                  <th scope="col" className="px-4 py-2">Location</th>
                  <th scope="col" className="px-4 py-2 last:pr-4 sm:last:pr-6">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {props.applications.map((application) => (
                  <tr
                    key={application.id}
                    className="group text-slate-600 transition-colors hover:bg-indigo-50/30 focus-within:bg-indigo-50/30"
                  >
                    <td className="px-4 py-2.5 first:pl-4 sm:first:pl-6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600">
                          {application.initials}
                        </span>
                        <span className="font-medium text-slate-900">
                          {application.company}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`${props.applicationsPath}/${application.slug}`}
                        className="rounded font-medium text-slate-700 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      >
                        {application.role}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        className={cn(
                          "rounded-md px-2 font-medium",
                          statusStyles[application.status],
                        )}
                      >
                        {application.status}
                      </Badge>
                    </td>
                    <td className="max-w-48 truncate px-4 py-2.5 text-slate-500">
                      {application.location}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 last:pr-4 sm:last:pr-6">
                      {application.updatedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
              <BriefcaseBusiness className="size-4" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-900">
              No applications yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add an application to see recent activity here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
