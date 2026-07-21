import { describe, expect, it } from "vitest";

import { getApplicationStatusTransition } from "./status-transition";

const now = new Date("2026-07-21T12:00:00.000Z");

describe("getApplicationStatusTransition", () => {
  it("sets appliedAt when entering Applied with no application date", () => {
    const transition = getApplicationStatusTransition(
      {
        currentStatus: "WISHLIST",
        targetStatus: "APPLIED",
        appliedAt: null,
      },
      now,
    );

    expect(transition).toEqual({
      changed: true,
      applicationData: { status: "APPLIED", appliedAt: now },
      historyData: { fromStatus: "WISHLIST", toStatus: "APPLIED" },
    });
  });

  it("preserves an existing appliedAt when entering Applied", () => {
    const existingAppliedAt = new Date("2026-07-01T08:00:00.000Z");
    const transition = getApplicationStatusTransition(
      {
        currentStatus: "INTERVIEW",
        targetStatus: "APPLIED",
        appliedAt: existingAppliedAt,
      },
      now,
    );

    expect(transition.applicationData).toEqual({ status: "APPLIED" });
  });

  it.each(["ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED"] as const)(
    "preserves appliedAt when moving to %s",
    (targetStatus) => {
      const transition = getApplicationStatusTransition(
        {
          currentStatus: "APPLIED",
          targetStatus,
          appliedAt: now,
        },
        new Date("2026-07-22T12:00:00.000Z"),
      );

      expect(transition.applicationData).toEqual({ status: targetStatus });
    },
  );

  it("does not erase appliedAt when moving to Wishlist", () => {
    const transition = getApplicationStatusTransition(
      {
        currentStatus: "INTERVIEW",
        targetStatus: "WISHLIST",
        appliedAt: now,
      },
      now,
    );

    expect(transition.applicationData).toEqual({ status: "WISHLIST" });
  });

  it("does not request an update or history record for a no-op", () => {
    expect(
      getApplicationStatusTransition(
        {
          currentStatus: "APPLIED",
          targetStatus: "APPLIED",
          appliedAt: now,
        },
        now,
      ),
    ).toEqual({
      changed: false,
      applicationData: null,
      historyData: null,
    });
  });
});
