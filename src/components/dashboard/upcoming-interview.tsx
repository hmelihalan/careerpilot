import Link from "next/link";
import { CalendarDays, Clock3, ExternalLink, MapPin, Video } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardUpcomingInterview } from "@/src/types/dashboard";

type UpcomingInterviewProps =
  | {
      applicationsPath: string;
      mode: "demo";
      interviews?: never;
    }
  | {
      applicationsPath: string;
      mode?: "authenticated";
      interviews: readonly DashboardUpcomingInterview[];
    };

function DemoInterview({ applicationsPath }: { applicationsPath: string }) {
  const applicationHref = `${applicationsPath}/kron-full-stack-intern`;
  return (
    <CardContent className="flex flex-1 flex-col">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-medium text-white">K</span>
        <div className="min-w-0">
          <Link href={applicationHref} className="block truncate text-sm font-medium text-slate-950 hover:text-indigo-700 hover:underline">Full Stack Intern</Link>
          <p className="mt-0.5 truncate text-xs text-slate-500">Kron</p>
        </div>
      </div>
      <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
        <div className="flex items-center gap-2"><CalendarDays className="size-3.5 text-slate-400" /><dt className="sr-only">Date</dt><dd>Tomorrow</dd></div>
        <div className="flex items-center gap-2"><Clock3 className="size-3.5 text-slate-400" /><dt className="sr-only">Time</dt><dd>14:30</dd></div>
        <div className="flex items-center gap-2"><Video className="size-3.5 text-slate-400" /><dt className="sr-only">Location</dt><dd>Google Meet</dd></div>
      </dl>
      <Link href={`${applicationHref}?tab=interview-prep`} className={cn(buttonVariants({ size: "sm" }), "mt-4 w-full")}>Prepare with AI</Link>
    </CardContent>
  );
}

export function UpcomingInterview(props: UpcomingInterviewProps) {
  const demo = props.mode === "demo";
  const interviews = demo ? [] : props.interviews;

  return (
    <Card size="sm" className="h-full border border-slate-200 shadow-none ring-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Upcoming Interviews</CardTitle>
          {!demo && interviews.length ? <span className="text-[10px] font-medium text-slate-400">Next {interviews.length}</span> : null}
        </div>
      </CardHeader>
      {demo ? (
        <DemoInterview applicationsPath={props.applicationsPath} />
      ) : interviews.length === 0 ? (
        <CardContent className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><CalendarDays className="size-4" aria-hidden="true" /></span>
          <p className="mt-3 text-xs font-medium text-slate-700">No interviews scheduled</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">Open an application to add the next interview round.</p>
        </CardContent>
      ) : (
        <CardContent className="space-y-3">
          {interviews.map((interview, index) => {
            const applicationHref = `${props.applicationsPath}/${encodeURIComponent(interview.slug)}`;
            return (
              <article key={interview.id} className={cn("pb-3", index < interviews.length - 1 && "border-b border-slate-100")}>
                <div className="flex items-start gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-medium text-white">{interview.initials}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`${applicationHref}?tab=interviews`} className="block truncate text-sm font-medium text-slate-950 hover:text-indigo-700 hover:underline">{interview.title}</Link>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{interview.role} · {interview.company}</p>
                    <p className="mt-1 text-[10px] font-medium text-indigo-600">Round {interview.roundNumber}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                  <p className="flex items-center gap-1.5"><CalendarDays className="size-3 text-slate-400" /> {interview.scheduledAtLabel}</p>
                  <p className="flex items-center gap-1.5"><Clock3 className="size-3 text-slate-400" /> {interview.durationMinutes} minutes</p>
                  {interview.location ? <p className="flex items-center gap-1.5"><MapPin className="size-3 text-slate-400" /> {interview.location}</p> : null}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Link href={`${applicationHref}?tab=interview-prep`} className={cn(buttonVariants({ variant: "outline", size: "xs" }), "flex-1")}>Prepare</Link>
                  {interview.meetingUrl ? <a href={interview.meetingUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "xs" })}><Video aria-hidden="true" /> Join <ExternalLink aria-hidden="true" /></a> : null}
                </div>
              </article>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
