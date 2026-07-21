import type { ApplicationStatus } from "@/src/types/application";

export type DashboardStatusCounts = {
  total: number;
  wishlist: number;
  applied: number;
  assessment: number;
  interview: number;
  offer: number;
  rejected: number;
};

export type DashboardRecentApplication = {
  id: string;
  slug: string;
  initials: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  location: string;
  updatedAt: string;
};

export type DashboardViewModel = {
  statusCounts: DashboardStatusCounts;
  responseRate: number;
  eligibleApplicationCount: number;
  recentApplications: readonly DashboardRecentApplication[];
};
