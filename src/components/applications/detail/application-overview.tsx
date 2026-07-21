
import {
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ApplicationOverviewData = {
  location: string;
  workMode: string;
  employmentType: string;
  applicationDate: string;
  deadline: string;
  source: string;
  salary: string;
  applicationUrl: string | null;
  summary: string | null;
  skills: readonly string[];
  createdAt?: string;
  updatedAt?: string;
};

type ApplicationOverviewProps = {
  details: ApplicationOverviewData;
  showMockHighlights?: boolean;
};

export function ApplicationOverview({
  details,
  showMockHighlights = true,
}: ApplicationOverviewProps) {
  const applicationDetails = [
    { label: "Location", value: details.location, Icon: MapPin },
    { label: "Work Mode", value: details.workMode, Icon: BriefcaseBusiness },
    {
      label: "Employment Type",
      value: details.employmentType,
      Icon: BriefcaseBusiness,
    },
    {
      label: "Application Date",
      value: details.applicationDate,
      Icon: CalendarDays,
    },
    { label: "Deadline", value: details.deadline, Icon: CalendarDays },
    { label: "Source", value: details.source, Icon: ExternalLink },
    { label: "Salary", value: details.salary, Icon: BriefcaseBusiness },
    ...(details.createdAt
      ? [{ label: "Created", value: details.createdAt, Icon: CalendarDays }]
      : []),
    ...(details.updatedAt
      ? [{ label: "Last Updated", value: details.updatedAt, Icon: Clock3 }]
      : []),
  ];

  return (
    <div
      className={
        showMockHighlights
          ? "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]"
          : "min-w-0"
      }
    >
      <div className="min-w-0 space-y-4">
        <Card size="sm" className="border border-slate-200 shadow-none ring-0">
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {applicationDetails.map(({ label, value, Icon }) => (
                <div key={label} className="flex min-w-0 gap-2.5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
              <div className="flex min-w-0 gap-2.5 sm:col-span-2">
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">Application URL</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium">
                    {details.applicationUrl ? (
                      <a
                        href={details.applicationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        View original listing
                      </a>
                    ) : (
                      <span className="text-slate-500">
                        No application URL available.
                      </span>
                    )}
                  </dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card size="sm" className="border border-slate-200 shadow-none ring-0">
          <CardHeader>
            <CardTitle>Job Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {details.summary ?? "No job description saved."}
            </p>
          </CardContent>
        </Card>

        <Card size="sm" className="border border-slate-200 shadow-none ring-0">
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {details.skills.length > 0 ? (
              details.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="rounded-md bg-slate-100 px-2 font-medium text-slate-700"
                >
                  {skill}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-slate-500">No skills saved.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {showMockHighlights ? (
        <aside className="space-y-4" aria-label="Application highlights">
          <Card size="sm" className="border border-slate-200 shadow-none ring-0">
            <CardHeader>
              <CardTitle>Upcoming Interview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <Clock3 className="size-3.5 text-slate-400" aria-hidden="true" />
                  Tomorrow at 14:30
                </p>
                <p className="flex items-center gap-2">
                  <Video className="size-3.5 text-slate-400" aria-hidden="true" />
                  Google Meet
                </p>
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                <p className="text-[11px] text-slate-500">Interview stage</p>
                <p className="mt-0.5 text-xs font-medium text-slate-800">
                  Technical Interview
                </p>
              </div>
              <Button size="sm" className="mt-3 w-full rounded-lg" disabled>
                Prepare with AI
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Demo only — AI preparation is not run.
              </p>
            </CardContent>
          </Card>

          <Card size="sm" className="border border-slate-200 shadow-none ring-0">
            <CardHeader>
              <CardTitle>Selected Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">
                    Software Engineering Resume
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Match score: 84%
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full rounded-lg"
                disabled
              >
                View Resume
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Simulated preview — no resume file is attached.
              </p>
            </CardContent>
          </Card>
        </aside>
      ) : null}
    </div>
  );
}
