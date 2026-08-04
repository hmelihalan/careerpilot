import type { ApplicationStatus } from "@/src/types/application";

export type AnalyticsSummary = {
  trackedApplications: number;
  responseRate: number;
  interviewRate: number;
  cvLinkedApplications: number;
  cvCoverageRate: number;
};

export type AnalyticsSourcePerformance = {
  source: string;
  applicationCount: number;
  responseCount: number;
  responseRate: number;
  interviewCount: number;
  interviewRate: number;
};

export type AnalyticsStageDuration = {
  status: ApplicationStatus;
  averageDays: number | null;
  durationLabel: string;
  completedTransitions: number;
};

export type AnalyticsResumePerformance = {
  key: string;
  resumeDraftId: string | null;
  resumeTitle: string;
  applicationCount: number;
  responseCount: number;
  responseRate: number;
  interviewCount: number;
  interviewRate: number;
  offerCount: number;
};

export type AnalyticsViewModel = {
  summary: AnalyticsSummary;
  sourcePerformance: readonly AnalyticsSourcePerformance[];
  stageDurations: readonly AnalyticsStageDuration[];
  resumePerformance: readonly AnalyticsResumePerformance[];
};
