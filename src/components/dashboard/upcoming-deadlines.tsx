import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { applicationStatusBadgeStyles as statusStyles } from "@/src/constants/application-status";
import type { DashboardUpcomingDeadline } from "@/src/types/dashboard";

type UpcomingDeadlinesProps = {
  applicationsPath: string;
  deadlines: readonly DashboardUpcomingDeadline[];
};

export function UpcomingDeadlines({
  applicationsPath,
  deadlines,
}: UpcomingDeadlinesProps) {
  return (
    <Card size="sm" className="h-full border border-slate-200 shadow-none ring-0">
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
        <p className="mt-0.5 text-xs text-slate-500">
          Nearest active application deadlines.
        </p>
      </CardHeader>
      <CardContent>
        {deadlines.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {deadlines.map((deadline) => (
              <Link
                key={deadline.id}
                href={`${applicationsPath}/${deadline.slug}`}
                aria-label={`View ${deadline.role} application at ${deadline.company}`}
                className="-mx-2 block rounded-lg px-2 py-3 transition-colors first:pt-1 last:pb-1 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <article>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-medium text-slate-900">
                        {deadline.role}
                      </h3>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {deadline.company}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "shrink-0 rounded-md px-1.5 text-[9px] font-medium",
                        statusStyles[deadline.status],
                      )}
                    >
                      {deadline.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="size-3 text-slate-400" aria-hidden="true" />
                      <time dateTime={deadline.deadline}>{deadline.deadlineLabel}</time>
                    </span>
                    {deadline.location ? (
                      <span className="flex min-w-0 items-center gap-1">
                        <MapPin className="size-3 shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="truncate">{deadline.location}</span>
                      </span>
                    ) : null}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
              <CalendarClock className="size-4" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-900">
              No upcoming deadlines
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Future deadlines for active applications will appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
