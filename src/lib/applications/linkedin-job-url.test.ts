import { describe, expect, it } from "vitest";

import { parseLinkedInJobUrl } from "./linkedin-job-url";

describe("parseLinkedInJobUrl", () => {
  it("extracts role, company, id, and a tracking-free canonical URL", () => {
    expect(
      parseLinkedInJobUrl(
        "https://www.linkedin.com/jobs/view/senior-ai-engineer-at-acme-labs-4277081132/?trackingId=test",
      ),
    ).toEqual({
      canonicalUrl: "https://www.linkedin.com/jobs/view/4277081132",
      company: "Acme Labs",
      jobId: "4277081132",
      role: "Senior AI Engineer",
    });
  });

  it("accepts numeric LinkedIn job URLs without inventing fields", () => {
    expect(
      parseLinkedInJobUrl("https://linkedin.com/jobs/view/4277081132"),
    ).toEqual({
      canonicalUrl: "https://www.linkedin.com/jobs/view/4277081132",
      company: "",
      jobId: "4277081132",
      role: "",
    });
  });

  it("rejects non-LinkedIn and non-job URLs", () => {
    expect(parseLinkedInJobUrl("https://example.com/jobs/view/12345")).toBeNull();
    expect(parseLinkedInJobUrl("https://linkedin.com/in/example")).toBeNull();
    expect(parseLinkedInJobUrl("https://linkedin.com/jobs/view/%E0%A4")).toBeNull();
  });
});
