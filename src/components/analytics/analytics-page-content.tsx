import Link from "next/link";
import {
  BarChart3,
  Clock3,
  FileCheck2,
  MessageCircleReply,
  Send,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { applicationStatusBadgeStyles } from "@/src/constants/application-status";
import type { AnalyticsViewModel } from "@/src/types/analytics";

type AnalyticsPageContentProps = {
  analytics: AnalyticsViewModel;
};

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Send;
}) {
  return (
    <Card size="sm" className="h-full border border-slate-200 shadow-none ring-0">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1.5 text-2xl font-medium tracking-tight text-slate-950">
              {value}
            </p>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPageContent({ analytics }: AnalyticsPageContentProps) {
  const { summary, sourcePerformance, stageDurations, resumePerformance } =
    analytics;
  const maxStageDays = Math.max(
    ...stageDurations.map((stage) => stage.averageDays ?? 0),
    1,
  );

  return (
    <div className="min-w-0 space-y-4">
      <section aria-labelledby="analytics-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              id="analytics-title"
              className="text-xl font-medium tracking-tight text-slate-950 sm:text-2xl"
            >
              Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Understand which sources, stages, and resumes move applications forward.
            </p>
          </div>
          <Badge
            variant="outline"
            className="rounded-md border-slate-200 bg-white px-2.5 text-[11px] text-slate-600"
          >
            All-time data
          </Badge>
        </div>
      </section>

      <section
        aria-label="Application performance summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          label="Tracked applications"
          value={summary.trackedApplications.toString()}
          description="Applications that moved beyond Wishlist."
          icon={Send}
        />
        <SummaryCard
          label="Response rate"
          value={`${summary.responseRate}%`}
          description="Reached assessment, interview, offer, or rejection."
          icon={MessageCircleReply}
        />
        <SummaryCard
          label="Interview rate"
          value={`${summary.interviewRate}%`}
          description="Reached Interview or Offer at least once."
          icon={Trophy}
        />
        <SummaryCard
          label="CV attribution"
          value={`${summary.cvCoverageRate}%`}
          description={`${summary.cvLinkedApplications} applications linked to a selected CV.`}
          icon={FileCheck2}
        />
      </section>

      <section className="grid items-start gap-3 xl:grid-cols-5" aria-label="Source and stage analytics">
        <Card size="sm" className="border border-slate-200 shadow-none ring-0 xl:col-span-3">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Performance by Source</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">
              Response and interview conversion for submitted applications.
            </p>
          </CardHeader>
          <CardContent>
            {sourcePerformance.length > 0 ? (
              <div className="space-y-4">
                <div className="hidden grid-cols-[minmax(120px,1fr)_72px_minmax(170px,2fr)_minmax(170px,2fr)] gap-3 border-b border-slate-100 pb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400 md:grid">
                  <span>Source</span>
                  <span className="text-right">Applied</span>
                  <span>Response rate</span>
                  <span>Interview rate</span>
                </div>
                {sourcePerformance.map((source) => (
                  <article
                    key={source.source}
                    className="grid gap-2 md:grid-cols-[minmax(120px,1fr)_72px_minmax(170px,2fr)_minmax(170px,2fr)] md:items-center md:gap-3"
                  >
                    <p className="truncate text-xs font-medium text-slate-900">
                      {source.source}
                    </p>
                    <p className="text-xs tabular-nums text-slate-500 md:text-right">
                      {source.applicationCount}
                    </p>
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500 md:hidden">Response</span>
                        <span className="font-medium tabular-nums text-slate-700">
                          {source.responseRate}%
                          <span className="ml-1 font-normal text-slate-400">
                            ({source.responseCount})
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${source.responseRate}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500 md:hidden">Interview</span>
                        <span className="font-medium tabular-nums text-slate-700">
                          {source.interviewRate}%
                          <span className="ml-1 font-normal text-slate-400">
                            ({source.interviewCount})
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${source.interviewRate}%` }}
                        />
                      </div>
                    </div>
                  </article>
                ))}
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-indigo-500" /> Response
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-violet-500" /> Interview
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <BarChart3 className="mx-auto size-5 text-slate-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-slate-900">No source data yet</p>
                <p className="mt-1 text-xs text-slate-500">Move an application beyond Wishlist to start measuring source performance.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="border border-slate-200 shadow-none ring-0 xl:col-span-2">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Average Time in Stage</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">
              Completed transitions only; current open stages are excluded.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {stageDurations.map((stage) => (
              <article key={stage.status}>
                <div className="flex items-center justify-between gap-3">
                  <Badge
                    className={cn(
                      "rounded-md px-2 text-[10px] font-medium",
                      applicationStatusBadgeStyles[stage.status],
                    )}
                  >
                    {stage.status}
                  </Badge>
                  <div className="text-right">
                    <p className="text-xs font-medium tabular-nums text-slate-700">
                      {stage.durationLabel}
                    </p>
                    {stage.completedTransitions > 0 ? (
                      <p className="text-[10px] text-slate-400">
                        {stage.completedTransitions} transition{stage.completedTransitions === 1 ? "" : "s"}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  {stage.averageDays !== null ? (
                    <div
                      className="h-full min-w-1 rounded-full bg-sky-500"
                      style={{ width: `${Math.max((stage.averageDays / maxStageDays) * 100, 3)}%` }}
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card size="sm" className="border border-slate-200 shadow-none ring-0">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Resume Performance</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">
            Outcomes grouped by immutable CV snapshots marked as submitted.
          </p>
        </CardHeader>
        <CardContent>
          {resumePerformance.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {resumePerformance.map((resume, index) => {
                const content = (
                  <article className="h-full rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-medium text-slate-900">
                            {resume.resumeTitle}
                          </h3>
                          {index === 0 ? (
                            <Badge className="rounded-md bg-emerald-50 px-2 text-[10px] text-emerald-700">
                              Highest interview rate
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {resume.applicationCount} linked application{resume.applicationCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      {resume.resumeDraftId ? (
                        <span className="text-[11px] font-medium text-indigo-600">Open CV →</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Deleted CV</span>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] text-slate-500">Response</p>
                        <p className="mt-1 text-sm font-medium tabular-nums text-slate-900">{resume.responseRate}%</p>
                        <p className="text-[10px] text-slate-400">{resume.responseCount} reached</p>
                      </div>
                      <div className="rounded-lg bg-violet-50 px-3 py-2">
                        <p className="text-[10px] text-violet-600">Interview</p>
                        <p className="mt-1 text-sm font-medium tabular-nums text-violet-900">{resume.interviewRate}%</p>
                        <p className="text-[10px] text-violet-500">{resume.interviewCount} reached</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-3 py-2">
                        <p className="text-[10px] text-emerald-600">Offers</p>
                        <p className="mt-1 text-sm font-medium tabular-nums text-emerald-900">{resume.offerCount}</p>
                        <p className="text-[10px] text-emerald-500">total offers</p>
                      </div>
                    </div>
                  </article>
                );

                return resume.resumeDraftId ? (
                  <Link
                    key={resume.key}
                    href={`/resume-builder?resume=${encodeURIComponent(resume.resumeDraftId)}`}
                    className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={resume.key}>{content}</div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <FileCheck2 className="mx-auto size-5 text-slate-400" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-slate-900">No CV outcomes yet</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Mark the CV used for an application as submitted, then update its status to compare outcomes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500" aria-label="Analytics methodology">
        <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <p>
          Rates use all submitted applications. Wishlist items are excluded. Small samples can produce large percentage swings, so compare the application counts before deciding which source or CV performs best.
        </p>
      </section>
    </div>
  );
}
