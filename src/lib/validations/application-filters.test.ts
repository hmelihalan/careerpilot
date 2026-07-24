import { describe, expect, it } from "vitest";

import { applicationsSearchParamsSchema } from "./application-filters";

describe("applicationsSearchParamsSchema", () => {
  it("accepts a canonical application status", () => {
    expect(
      applicationsSearchParamsSchema.safeParse({ status: "INTERVIEW" }),
    ).toMatchObject({
      success: true,
      data: { status: "INTERVIEW" },
    });
  });

  it("rejects invalid and repeated status values", () => {
    expect(
      applicationsSearchParamsSchema.safeParse({ status: "UNKNOWN" }).success,
    ).toBe(false);
    expect(
      applicationsSearchParamsSchema.safeParse({
        status: ["INTERVIEW", "OFFER"],
      }).success,
    ).toBe(false);
  });
});
