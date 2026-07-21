import {
  BriefcaseBusiness,
  CalendarCheck2,
  Percent,
  Sparkles,
  Trophy,
} from "lucide-react";

import { AiRecommendation } from "@/src/components/dashboard/ai-recommendation";
import { MetricCard } from "@/src/components/dashboard/metric-card";
import { PipelinePreview } from "@/src/components/dashboard/pipeline-preview";
import { RecentApplications } from "@/src/components/dashboard/recent-applications";
import { UpcomingInterview } from "@/src/components/dashboard/upcoming-interview";
import { DemoModeNotice } from "@/src/components/shared/demo-mode-notice";
import { appRoutes } from "@/src/constants/navigation";
import type { DashboardViewModel } from "@/src/types/dashboard";

const demoMetrics = [
  {
    label: "Total Applications",
    value: "31",
    trend: "+4 this week",
    icon: BriefcaseBusiness,
  },
  {
    label: "Interviews",
    value: "6",
    trend: "+2 this week",
    icon: CalendarCheck2,
  },
  {
    label: "Offers",
    value: "2",
    trend: "Same as last week",
    icon: Trophy,
    unchanged: true,
  },
  {
    label: "Avg. AI Match",
    value: "78%",
    trend: "+3% this week",
    icon: Sparkles,
  },
] as const;

type DashboardPageContentProps =
  | {
      mode: "demo";
      dashboard?: never;
    }
  | {
      mode?: "authenticated";
      dashboard: DashboardViewModel;
    };

export function DashboardPageContent(props: DashboardPageContentProps) {
  const demoMode = props.mode === "demo";
  const applicationsPath = demoMode
    ? appRoutes.demo.applications
    : appRoutes.authenticated.applications;
  const metrics = demoMode
    ? demoMetrics
    : [
        {
          label: "Total Applications",
          value: props.dashboard.statusCounts.total.toString(),
          trend: "Across all tracked statuses",
          icon: BriefcaseBusiness,
          unchanged: true,
        },
        {
          label: "Interviews",
          value: props.dashboard.statusCounts.interview.toString(),
          trend: "Currently in the interview stage",
          icon: CalendarCheck2,
          unchanged: true,
        },
        {
          label: "Offers",
          value: props.dashboard.statusCounts.offer.toString(),
          trend: "Current offers",
          icon: Trophy,
          unchanged: true,
        },
        {
          label: "Response Rate",
          value: `${props.dashboard.responseRate}%`,
          trend: `${props.dashboard.eligibleApplicationCount} eligible applications`,
          icon: Percent,
          unchanged: true,
        },
      ];

  return (
    <div className="space-y-4">
      {demoMode ? <DemoModeNotice /> : null}

      <section aria-labelledby="dashboard-greeting">
        <h1
          id="dashboard-greeting"
          className="text-xl font-medium tracking-tight text-slate-950 sm:text-2xl"
        >
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here is what is happening with your job search.
        </p>
      </section>

      <section
        aria-label="Job search metrics"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section
        aria-label="Application overview"
        className="grid items-start gap-3 xl:grid-cols-10"
      >
        <div className="min-w-0 xl:col-span-7">
          {demoMode ? (
            <PipelinePreview mode="demo" applicationsPath={applicationsPath} />
          ) : (
            <PipelinePreview
              applicationsPath={applicationsPath}
              dashboard={props.dashboard}
            />
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-1">
          <UpcomingInterview
            applicationsPath={applicationsPath}
            unavailable={!demoMode}
          />
          <AiRecommendation
            applicationsPath={applicationsPath}
            unavailable={!demoMode}
          />
        </div>
      </section>

      {demoMode ? (
        <RecentApplications mode="demo" applicationsPath={applicationsPath} />
      ) : (
        <RecentApplications
          applicationsPath={applicationsPath}
          applications={props.dashboard.recentApplications}
        />
      )}
    </div>
  );
}
