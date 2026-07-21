import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMockApplicationsBySlugs } from "@/src/constants/mock-applications";
import type { ApplicationStatus } from "@/src/types/application";
import type {
  DashboardRecentApplication,
  DashboardViewModel,
} from "@/src/types/dashboard";

const demoPipeline = [
  {
    stage: "Wishlist",
    applications: getMockApplicationsBySlugs([
      "miro-frontend-developer",
      "spotify-web-engineer",
    ]),
  },
  {
    stage: "Applied",
    applications: getMockApplicationsBySlugs([
      "getir-junior-react-developer",
      "atlassian-junior-engineer",
      "trendyol-software-engineer",
    ]),
  },
  {
    stage: "Assessment",
    applications: getMockApplicationsBySlugs(["insider-junior-web-developer"]),
  },
  {
    stage: "Interview",
    applications: getMockApplicationsBySlugs(["kron-full-stack-intern"]),
  },
  {
    stage: "Offer",
    applications: getMockApplicationsBySlugs(["peak-frontend-intern"]),
  },
] as const;

type PipelinePreviewProps =
  | {
      mode: "demo";
      applicationsPath: string;
      dashboard?: never;
    }
  | {
      mode?: "authenticated";
      applicationsPath: string;
      dashboard: DashboardViewModel;
    };

type AuthenticatedPipelineStage = {
  stage: ApplicationStatus;
  count: number;
  applications: readonly DashboardRecentApplication[];
};

export function PipelinePreview(props: PipelinePreviewProps) {
  const demoMode = props.mode === "demo";
  const authenticatedPipeline: readonly AuthenticatedPipelineStage[] = demoMode
    ? []
    : [
        {
          stage: "Wishlist",
          count: props.dashboard.statusCounts.wishlist,
          applications: props.dashboard.recentApplications.filter(
            (application) => application.status === "Wishlist",
          ),
        },
        {
          stage: "Applied",
          count: props.dashboard.statusCounts.applied,
          applications: props.dashboard.recentApplications.filter(
            (application) => application.status === "Applied",
          ),
        },
        {
          stage: "Assessment",
          count: props.dashboard.statusCounts.assessment,
          applications: props.dashboard.recentApplications.filter(
            (application) => application.status === "Assessment",
          ),
        },
        {
          stage: "Interview",
          count: props.dashboard.statusCounts.interview,
          applications: props.dashboard.recentApplications.filter(
            (application) => application.status === "Interview",
          ),
        },
        {
          stage: "Offer",
          count: props.dashboard.statusCounts.offer,
          applications: props.dashboard.recentApplications.filter(
            (application) => application.status === "Offer",
          ),
        },
      ];

  return (
    <Card size="sm" className="border border-slate-200 shadow-none ring-0">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Application Pipeline</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">
            Track your active opportunities.
          </p>
        </div>
        <Link
          href={props.applicationsPath}
          className="rounded text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="scrollbar-thin overflow-x-auto pb-1">
          <div className="grid grid-cols-[repeat(5,minmax(120px,1fr))] gap-2.5">
            {demoMode
              ? demoPipeline.map((column) => (
                  <section
                    key={column.stage}
                    aria-labelledby={`pipeline-${column.stage}`}
                    className="min-w-0"
                  >
                    <div className="mb-2 flex items-center gap-1.5">
                      <h3
                        id={`pipeline-${column.stage}`}
                        className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
                      >
                        {column.stage}
                      </h3>
                      <span className="flex size-4.5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500">
                        {column.applications.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {column.applications.map((application) => (
                        <Link
                          key={application.id}
                          href={`${props.applicationsPath}/${application.slug}`}
                          aria-label={`View ${application.role} application at ${application.company}`}
                          className="block cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        >
                          <article className="min-w-0">
                            <h4
                              className="truncate text-xs font-medium leading-4 text-slate-900"
                              title={application.role}
                            >
                              {application.role}
                            </h4>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {application.company}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-1.5">
                              <span className="flex min-w-0 items-center gap-1 text-[10px] text-slate-500">
                                <MapPin
                                  className="size-2.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  {application.workMode}
                                </span>
                              </span>
                              <Badge className="h-4.5 shrink-0 rounded-md bg-indigo-50 px-1.5 text-[9px] font-medium text-indigo-700">
                                {application.matchScore}%
                              </Badge>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))
              : authenticatedPipeline.map((column) => {
                  const hiddenCount = Math.max(
                    column.count - column.applications.length,
                    0,
                  );

                  return (
                    <section
                      key={column.stage}
                      aria-labelledby={`pipeline-${column.stage}`}
                      className="min-w-0"
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <h3
                          id={`pipeline-${column.stage}`}
                          className="text-[11px] font-medium uppercase tracking-wide text-slate-500"
                        >
                          {column.stage}
                        </h3>
                        <span className="flex size-4.5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500">
                          {column.count}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {column.applications.map((application) => (
                          <Link
                            key={application.id}
                            href={`${props.applicationsPath}/${application.slug}`}
                            aria-label={`View ${application.role} application at ${application.company}`}
                            className="block cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                          >
                            <article className="min-w-0">
                              <h4
                                className="truncate text-xs font-medium leading-4 text-slate-900"
                                title={application.role}
                              >
                                {application.role}
                              </h4>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                {application.company}
                              </p>
                              <div className="mt-2 flex min-w-0 items-center gap-1 text-[10px] text-slate-500">
                                <Clock3
                                  className="size-2.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  Updated {application.updatedAt}
                                </span>
                              </div>
                            </article>
                          </Link>
                        ))}
                        {column.count === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[10px] text-slate-400">
                            No applications
                          </p>
                        ) : column.applications.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[10px] text-slate-400">
                            No recent updates
                          </p>
                        ) : null}
                        {hiddenCount > 0 ? (
                          <p className="text-center text-[10px] text-slate-400">
                            +{hiddenCount} more
                          </p>
                        ) : null}
                      </div>
                    </section>
                  );
                })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
