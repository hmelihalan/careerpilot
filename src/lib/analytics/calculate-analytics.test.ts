import { describe, expect, it } from "vitest";

import { ApplicationStatus } from "../../generated/prisma/enums";
import { calculateAnalytics } from "./calculate-analytics";

type AnalyticsInput = Parameters<typeof calculateAnalytics>[0][number];

function application(
  id: string,
  overrides: Partial<AnalyticsInput> = {},
): AnalyticsInput {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  return {
    id,
    status: ApplicationStatus.APPLIED,
    source: "LinkedIn",
    createdAt,
    statusHistory: [
      {
        fromStatus: null,
        toStatus: ApplicationStatus.APPLIED,
        changedAt: createdAt,
      },
    ],
    material: null,
    ...overrides,
  };
}

describe("calculateAnalytics", () => {
  it("calculates response and interview rates by source from status history", () => {
    const result = calculateAnalytics([
      application("linkedin-waiting"),
      application("linkedin-interviewed", {
        status: ApplicationStatus.REJECTED,
        statusHistory: [
          {
            fromStatus: null,
            toStatus: ApplicationStatus.APPLIED,
            changedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
          {
            fromStatus: ApplicationStatus.APPLIED,
            toStatus: ApplicationStatus.INTERVIEW,
            changedAt: new Date("2026-01-05T00:00:00.000Z"),
          },
          {
            fromStatus: ApplicationStatus.INTERVIEW,
            toStatus: ApplicationStatus.REJECTED,
            changedAt: new Date("2026-01-10T00:00:00.000Z"),
          },
        ],
      }),
      application("referral-assessment", {
        source: "Referral",
        status: ApplicationStatus.ASSESSMENT,
      }),
    ]);

    expect(result.summary).toMatchObject({
      trackedApplications: 3,
      responseRate: 67,
      interviewRate: 33,
    });
    expect(result.sourcePerformance).toEqual([
      {
        source: "LinkedIn",
        applicationCount: 2,
        responseCount: 1,
        responseRate: 50,
        interviewCount: 1,
        interviewRate: 50,
      },
      {
        source: "Referral",
        applicationCount: 1,
        responseCount: 1,
        responseRate: 100,
        interviewCount: 0,
        interviewRate: 0,
      },
    ]);
  });

  it("averages only completed time between stage transitions", () => {
    const result = calculateAnalytics([
      application("first", {
        status: ApplicationStatus.INTERVIEW,
        statusHistory: [
          {
            fromStatus: null,
            toStatus: ApplicationStatus.APPLIED,
            changedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
          {
            fromStatus: ApplicationStatus.APPLIED,
            toStatus: ApplicationStatus.ASSESSMENT,
            changedAt: new Date("2026-01-03T00:00:00.000Z"),
          },
          {
            fromStatus: ApplicationStatus.ASSESSMENT,
            toStatus: ApplicationStatus.INTERVIEW,
            changedAt: new Date("2026-01-06T00:00:00.000Z"),
          },
        ],
      }),
      application("second", {
        status: ApplicationStatus.ASSESSMENT,
        statusHistory: [
          {
            fromStatus: null,
            toStatus: ApplicationStatus.APPLIED,
            changedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
          {
            fromStatus: ApplicationStatus.APPLIED,
            toStatus: ApplicationStatus.ASSESSMENT,
            changedAt: new Date("2026-01-05T00:00:00.000Z"),
          },
        ],
      }),
    ]);

    expect(result.stageDurations.find((stage) => stage.status === "Applied")).toEqual({
      status: "Applied",
      averageDays: 3,
      durationLabel: "3.0 days",
      completedTransitions: 2,
    });
    expect(
      result.stageDurations.find((stage) => stage.status === "Assessment"),
    ).toEqual({
      status: "Assessment",
      averageDays: 3,
      durationLabel: "3.0 days",
      completedTransitions: 1,
    });
    expect(
      result.stageDurations.find((stage) => stage.status === "Interview"),
    ).toMatchObject({ averageDays: null, completedTransitions: 0 });
  });

  it("ranks linked resumes by interview and offer outcomes", () => {
    const result = calculateAnalytics([
      application("resume-a-interview", {
        status: ApplicationStatus.INTERVIEW,
        material: { resumeDraftId: "resume-a", resumeTitle: "Frontend CV" },
      }),
      application("resume-a-waiting", {
        material: { resumeDraftId: "resume-a", resumeTitle: "Frontend CV" },
      }),
      application("resume-b-offer", {
        status: ApplicationStatus.OFFER,
        material: { resumeDraftId: "resume-b", resumeTitle: "Product CV" },
      }),
      application("not-linked"),
    ]);

    expect(result.summary).toMatchObject({
      trackedApplications: 4,
      cvLinkedApplications: 3,
      cvCoverageRate: 75,
    });
    expect(result.resumePerformance.map((resume) => resume.resumeTitle)).toEqual([
      "Product CV",
      "Frontend CV",
    ]);
    expect(result.resumePerformance[0]).toMatchObject({
      applicationCount: 1,
      responseRate: 100,
      interviewRate: 100,
      offerCount: 1,
    });
    expect(result.resumePerformance[1]).toMatchObject({
      applicationCount: 2,
      responseRate: 50,
      interviewRate: 50,
      offerCount: 0,
    });
  });

  it("returns stable zero values without application data", () => {
    const result = calculateAnalytics([]);
    expect(result.summary).toEqual({
      trackedApplications: 0,
      responseRate: 0,
      interviewRate: 0,
      cvLinkedApplications: 0,
      cvCoverageRate: 0,
    });
    expect(result.sourcePerformance).toEqual([]);
    expect(result.resumePerformance).toEqual([]);
    expect(result.stageDurations).toHaveLength(6);
  });
});
