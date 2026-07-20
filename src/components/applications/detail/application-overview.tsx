import Link from "next/link";
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
  applicationUrl: string;
  summary: string;
  skills: readonly string[];
};

type ApplicationOverviewProps = {
  details: ApplicationOverviewData;
};

const detailIcons = [
  MapPin,
  BriefcaseBusiness,
  BriefcaseBusiness,
  CalendarDays,
  CalendarDays,
  ExternalLink,
  BriefcaseBusiness,
] as const;

export function ApplicationOverview({ details }: ApplicationOverviewProps) {
  const applicationDetails = [
    ["Location", details.location],
    ["Work Mode", details.workMode],
    ["Employment Type", details.employmentType],
    ["Application Date", details.applicationDate],
    ["Deadline", details.deadline],
    ["Source", details.source],
    ["Salary", details.salary],
  ] as const;

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
        <Card size="sm" className="border border-slate-200 shadow-none ring-0">
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {applicationDetails.map(([label, value], index) => {
                const Icon = detailIcons[index];

                return (
                  <div key={label} className="flex min-w-0 gap-2.5">
                    <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">
                        {value}
                      </dd>
                    </div>
                  </div>
                );
              })}
              <div className="flex min-w-0 gap-2.5 sm:col-span-2">
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">Application URL</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium">
                    <a
                      href={details.applicationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      View original listing
                    </a>
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
            <p className="text-sm leading-6 text-slate-600">{details.summary}</p>
          </CardContent>
        </Card>

        <Card size="sm" className="border border-slate-200 shadow-none ring-0">
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {details.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="rounded-md bg-slate-100 px-2 font-medium text-slate-700"
              >
                {skill}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

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
            <Button size="sm" className="mt-3 w-full rounded-lg">
              Prepare with AI
            </Button>
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
                <p className="mt-0.5 text-[11px] text-slate-500">Match score: 84%</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full rounded-lg"
              nativeButton={false}
              render={<Link href="#" />}
            >
              View Resume
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
