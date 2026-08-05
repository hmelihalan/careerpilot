import { ApplicationStatus } from "../../generated/prisma/enums";
import { APPLICATION_STATUS_META } from "../../constants/application-status";
import type {
  AnalyticsResumePerformance,
  AnalyticsSourcePerformance,
  AnalyticsStageDuration,
  AnalyticsViewModel,
} from "../../types/analytics";

type AnalyticsApplicationInput = {
  id: string;
  status: ApplicationStatus;
  source: string | null;
  createdAt: Date;
  statusHistory: readonly {
    fromStatus: ApplicationStatus | null;
    toStatus: ApplicationStatus;
    changedAt: Date;
  }[];
  submittedResume: {
    sourceResumeDraftId: string | null;
    resumeTitle: string;
  } | null;
};

const STATUS_ORDER = [
  ApplicationStatus.WISHLIST,
  ApplicationStatus.APPLIED,
  ApplicationStatus.ASSESSMENT,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
] as const;

const RESPONDED_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.ASSESSMENT,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
]);

const INTERVIEW_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
]);

function percentage(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

function visitedStatuses(application: AnalyticsApplicationInput): Set<ApplicationStatus> {
  return new Set([
    application.status,
    ...application.statusHistory.flatMap((event) =>
      event.fromStatus ? [event.fromStatus, event.toStatus] : [event.toStatus],
    ),
  ]);
}

function hasAnyStatus(
  visited: ReadonlySet<ApplicationStatus>,
  targetStatuses: ReadonlySet<ApplicationStatus>,
): boolean {
  return [...targetStatuses].some((status) => visited.has(status));
}

function isEligible(visited: ReadonlySet<ApplicationStatus>): boolean {
  return [...visited].some((status) => status !== ApplicationStatus.WISHLIST);
}

function formatDuration(averageDays: number | null): string {
  if (averageDays === null) return "No completed transitions";
  if (averageDays < 1) return "<1 day";
  return `${averageDays.toFixed(averageDays < 10 ? 1 : 0)} days`;
}

function calculateSourcePerformance(
  applications: readonly AnalyticsApplicationInput[],
): AnalyticsSourcePerformance[] {
  const groups = new Map<
    string,
    { applicationCount: number; responseCount: number; interviewCount: number }
  >();

  for (const application of applications) {
    const visited = visitedStatuses(application);
    if (!isEligible(visited)) continue;

    const source = application.source?.trim() || "Unknown";
    const group = groups.get(source) ?? {
      applicationCount: 0,
      responseCount: 0,
      interviewCount: 0,
    };
    group.applicationCount += 1;
    if (hasAnyStatus(visited, RESPONDED_STATUSES)) group.responseCount += 1;
    if (hasAnyStatus(visited, INTERVIEW_STATUSES)) group.interviewCount += 1;
    groups.set(source, group);
  }

  return [...groups.entries()]
    .map(([source, group]) => ({
      source,
      ...group,
      responseRate: percentage(group.responseCount, group.applicationCount),
      interviewRate: percentage(group.interviewCount, group.applicationCount),
    }))
    .sort(
      (left, right) =>
        right.applicationCount - left.applicationCount ||
        right.responseRate - left.responseRate ||
        left.source.localeCompare(right.source),
    );
}

function calculateStageDurations(
  applications: readonly AnalyticsApplicationInput[],
): AnalyticsStageDuration[] {
  const samples = new Map<ApplicationStatus, { totalMs: number; count: number }>();

  for (const application of applications) {
    const history = [...application.statusHistory].sort(
      (left, right) => left.changedAt.getTime() - right.changedAt.getTime(),
    );
    const firstEvent = history[0];
    const visits = [
      ...(firstEvent?.fromStatus
        ? [{ toStatus: firstEvent.fromStatus, changedAt: application.createdAt }]
        : []),
      ...history.map(({ toStatus, changedAt }) => ({ toStatus, changedAt })),
      ...(history.length === 0
        ? [{ toStatus: application.status, changedAt: application.createdAt }]
        : []),
    ];

    for (let index = 0; index < visits.length - 1; index += 1) {
      const visit = visits[index];
      const nextVisit = visits[index + 1];
      if (!visit || !nextVisit) continue;
      const durationMs = nextVisit.changedAt.getTime() - visit.changedAt.getTime();
      if (!Number.isFinite(durationMs) || durationMs < 0) continue;

      const sample = samples.get(visit.toStatus) ?? { totalMs: 0, count: 0 };
      sample.totalMs += durationMs;
      sample.count += 1;
      samples.set(visit.toStatus, sample);
    }
  }

  return STATUS_ORDER.map((status) => {
    const sample = samples.get(status);
    const averageDays = sample
      ? Math.round((sample.totalMs / sample.count / 86_400_000) * 10) / 10
      : null;
    return {
      status: APPLICATION_STATUS_META[status].label,
      averageDays,
      durationLabel: formatDuration(averageDays),
      completedTransitions: sample?.count ?? 0,
    };
  });
}

function calculateResumePerformance(
  applications: readonly AnalyticsApplicationInput[],
): AnalyticsResumePerformance[] {
  const groups = new Map<
    string,
    Omit<
      AnalyticsResumePerformance,
      "responseRate" | "interviewRate"
    >
  >();

  for (const application of applications) {
    if (!application.submittedResume) continue;
    const visited = visitedStatuses(application);
    if (!isEligible(visited)) continue;

    const { sourceResumeDraftId: resumeDraftId, resumeTitle } =
      application.submittedResume;
    const key = resumeDraftId ?? `deleted:${resumeTitle}`;
    const group = groups.get(key) ?? {
      key,
      resumeDraftId,
      resumeTitle,
      applicationCount: 0,
      responseCount: 0,
      interviewCount: 0,
      offerCount: 0,
    };
    group.applicationCount += 1;
    if (hasAnyStatus(visited, RESPONDED_STATUSES)) group.responseCount += 1;
    if (hasAnyStatus(visited, INTERVIEW_STATUSES)) group.interviewCount += 1;
    if (visited.has(ApplicationStatus.OFFER)) group.offerCount += 1;
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      responseRate: percentage(group.responseCount, group.applicationCount),
      interviewRate: percentage(group.interviewCount, group.applicationCount),
    }))
    .sort(
      (left, right) =>
        right.interviewRate - left.interviewRate ||
        right.offerCount - left.offerCount ||
        right.responseRate - left.responseRate ||
        right.applicationCount - left.applicationCount ||
        left.resumeTitle.localeCompare(right.resumeTitle),
    );
}

export function calculateAnalytics(
  applications: readonly AnalyticsApplicationInput[],
): AnalyticsViewModel {
  const eligible = applications.filter((application) =>
    isEligible(visitedStatuses(application)),
  );
  const responseCount = eligible.filter((application) =>
    hasAnyStatus(visitedStatuses(application), RESPONDED_STATUSES),
  ).length;
  const interviewCount = eligible.filter((application) =>
    hasAnyStatus(visitedStatuses(application), INTERVIEW_STATUSES),
  ).length;
  const cvLinkedApplications = eligible.filter(
    (application) => application.submittedResume !== null,
  ).length;

  return {
    summary: {
      trackedApplications: eligible.length,
      responseRate: percentage(responseCount, eligible.length),
      interviewRate: percentage(interviewCount, eligible.length),
      cvLinkedApplications,
      cvCoverageRate: percentage(cvLinkedApplications, eligible.length),
    },
    sourcePerformance: calculateSourcePerformance(applications),
    stageDurations: calculateStageDurations(applications),
    resumePerformance: calculateResumePerformance(applications),
  };
}
