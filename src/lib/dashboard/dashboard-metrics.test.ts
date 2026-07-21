import { describe, expect, it } from "vitest";

import { calculateDashboardMetrics } from "./dashboard-metrics";

describe("calculateDashboardMetrics", () => {
  it("returns zero metrics without producing NaN", () => {
    const metrics = calculateDashboardMetrics([]);

    expect(metrics.statusCounts.total).toBe(0);
    expect(metrics.eligibleApplicationCount).toBe(0);
    expect(metrics.responseRate).toBe(0);
    expect(Number.isNaN(metrics.responseRate)).toBe(false);
  });

  it("excludes Wishlist and treats Applied as eligible but not responded", () => {
    const metrics = calculateDashboardMetrics([
      { status: "WISHLIST", count: 20 },
      { status: "APPLIED", count: 3 },
      { status: "INTERVIEW", count: 1 },
    ]);

    expect(metrics.statusCounts.total).toBe(24);
    expect(metrics.eligibleApplicationCount).toBe(4);
    expect(metrics.responseRate).toBe(25);
  });

  it("counts Assessment, Interview, Offer, and Rejected as responses", () => {
    const metrics = calculateDashboardMetrics([
      { status: "WISHLIST", count: 50 },
      { status: "APPLIED", count: 4 },
      { status: "ASSESSMENT", count: 1 },
      { status: "INTERVIEW", count: 1 },
      { status: "OFFER", count: 1 },
      { status: "REJECTED", count: 1 },
    ]);

    expect(metrics.eligibleApplicationCount).toBe(8);
    expect(metrics.responseRate).toBe(50);
    expect(metrics.statusCounts).toEqual({
      total: 58,
      wishlist: 50,
      applied: 4,
      assessment: 1,
      interview: 1,
      offer: 1,
      rejected: 1,
    });
  });
});
