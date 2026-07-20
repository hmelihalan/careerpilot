import { BriefcaseBusiness, CalendarCheck2, Sparkles, Trophy } from "lucide-react";

import { AiRecommendation } from "@/src/components/dashboard/ai-recommendation";
import { MetricCard } from "@/src/components/dashboard/metric-card";
import { PipelinePreview } from "@/src/components/dashboard/pipeline-preview";
import { RecentApplications } from "@/src/components/dashboard/recent-applications";
import { UpcomingInterview } from "@/src/components/dashboard/upcoming-interview";
import { DemoModeNotice } from "@/src/components/shared/demo-mode-notice";
import { appRoutes } from "@/src/constants/navigation";
import type { AppMode } from "@/src/types/navigation";

const metrics = [
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

type DashboardPageContentProps = {
  mode?: AppMode;
};

export function DashboardPageContent({
  mode = "authenticated",
}: DashboardPageContentProps) {
  const applicationsPath = appRoutes[mode].applications;

  return (
    <div className="space-y-4">
      {mode === "demo" ? <DemoModeNotice /> : null}

      <section aria-labelledby="dashboard-greeting">
        <h1
          id="dashboard-greeting"
          className="text-xl font-medium tracking-tight text-slate-950 sm:text-2xl"
        >
          Good afternoon
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here is what is happening with your job search.
        </p>
      </section>

      <section aria-label="Job search metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section aria-label="Application overview" className="grid items-start gap-3 xl:grid-cols-10">
        <div className="min-w-0 xl:col-span-7">
          <PipelinePreview applicationsPath={applicationsPath} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-1">
          <UpcomingInterview applicationsPath={applicationsPath} />
          <AiRecommendation applicationsPath={applicationsPath} />
        </div>
      </section>

      <RecentApplications applicationsPath={applicationsPath} />
    </div>
  );
}
