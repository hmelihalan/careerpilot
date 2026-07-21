export type DashboardMetricStatus =
  | "WISHLIST"
  | "APPLIED"
  | "ASSESSMENT"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED";

export type DashboardStatusCount = {
  status: DashboardMetricStatus;
  count: number;
};

export type DashboardMetrics = {
  statusCounts: {
    total: number;
    wishlist: number;
    applied: number;
    assessment: number;
    interview: number;
    offer: number;
    rejected: number;
  };
  responseRate: number;
  eligibleApplicationCount: number;
};

export function calculateDashboardMetrics(
  statusGroups: readonly DashboardStatusCount[],
): DashboardMetrics {
  const counts: Record<DashboardMetricStatus, number> = {
    WISHLIST: 0,
    APPLIED: 0,
    ASSESSMENT: 0,
    INTERVIEW: 0,
    OFFER: 0,
    REJECTED: 0,
  };

  statusGroups.forEach(({ status, count }) => {
    counts[status] = count;
  });

  const responded =
    counts.ASSESSMENT + counts.INTERVIEW + counts.OFFER + counts.REJECTED;
  const eligibleApplicationCount = counts.APPLIED + responded;
  const responseRate =
    eligibleApplicationCount === 0
      ? 0
      : Math.round((responded / eligibleApplicationCount) * 100);

  return {
    statusCounts: {
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
      wishlist: counts.WISHLIST,
      applied: counts.APPLIED,
      assessment: counts.ASSESSMENT,
      interview: counts.INTERVIEW,
      offer: counts.OFFER,
      rejected: counts.REJECTED,
    },
    responseRate,
    eligibleApplicationCount,
  };
}
