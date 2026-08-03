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
  location: string | null;
  salary: string | null;
  appliedAt: string | null;
  updatedAt: string;
};

export type DashboardUpcomingDeadline = {
  id: string;
  slug: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  location: string | null;
  deadline: string;
  deadlineLabel: string;
};

export type DashboardUpcomingReminder = {
  id: string;
  slug: string;
  company: string;
  role: string;
  title: string;
  remindAt: string;
  remindAtLabel: string;
  overdue: boolean;
};

export type DashboardViewModel = {
  statusCounts: DashboardStatusCounts;
  responseRate: number;
  eligibleApplicationCount: number;
  recentApplications: readonly DashboardRecentApplication[];
  upcomingDeadlines: readonly DashboardUpcomingDeadline[];
  upcomingReminders: readonly DashboardUpcomingReminder[];
};
