import Link from "next/link";
import { CalendarDays, Clock3, Video } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UpcomingInterviewProps = {
  applicationsPath: string;
  unavailable?: boolean;
};

export function UpcomingInterview({
  applicationsPath,
  unavailable = false,
}: UpcomingInterviewProps) {
  const applicationHref = `${applicationsPath}/kron-full-stack-intern`;

  if (unavailable) {
    return (
      <Card size="sm" className="h-full border border-slate-200 shadow-none ring-0">
        <CardHeader>
          <CardTitle>Upcoming Interview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <CalendarDays className="size-4" aria-hidden="true" />
          </span>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Interview scheduling is not available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm" className="h-full border border-slate-200 shadow-none ring-0">
      <CardHeader>
        <CardTitle>Upcoming Interview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-medium text-white">
            K
          </span>
          <div className="min-w-0">
            <Link
              href={applicationHref}
              className="block truncate rounded text-sm font-medium text-slate-950 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Full Stack Intern
            </Link>
            <p className="mt-0.5 truncate text-xs text-slate-500">Kron</p>
          </div>
        </div>

        <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-3.5 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">Date</dt>
            <dd>Tomorrow</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="size-3.5 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">Time</dt>
            <dd>14:30</dd>
          </div>
          <div className="flex items-center gap-2">
            <Video className="size-3.5 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">Location</dt>
            <dd>Google Meet</dd>
          </div>
        </dl>

        <Link
          href={`${applicationHref}?tab=interview-prep`}
          className="mt-4 inline-flex h-7 w-full items-center justify-center rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Prepare with AI
        </Link>
      </CardContent>
    </Card>
  );
}
