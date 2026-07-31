import { describe, expect, it } from "vitest";

import { previewResumeImprovement } from "./apply-improvement";
import { createEmptyResumeDocument } from "./schema";

describe("previewResumeImprovement", () => {
  it("previews a grounded summary replacement", () => {
    const draft = {
      ...createEmptyResumeDocument(),
      summary: "Frontend developer building accessible React products.",
    };
    const preview = previewResumeImprovement(draft, {
      priority: "high",
      category: "clarity",
      issue: "The professional summary is too broad.",
      evidence: "Frontend developer building accessible React products.",
      recommendation: "Make the summary more direct.",
      example: "Frontend developer focused on accessible React products.",
    });

    expect(preview?.section).toBe("summary");
    expect(preview?.draft.summary).toContain("focused");
  });

  it("replaces the matching experience bullet", () => {
    const draft = {
      ...createEmptyResumeDocument(),
      experience: [
        {
          id: "exp-1",
          role: "Developer",
          company: "Example",
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          bullets: ["Built accessible React components for the product."],
        },
      ],
    };
    const preview = previewResumeImprovement(draft, {
      priority: "medium",
      category: "experience",
      issue: "Use a stronger verb.",
      evidence: "Built accessible React components",
      recommendation: "Make the contribution clearer.",
      example: "Delivered accessible React components for the core product.",
    });

    expect(preview?.draft.experience[0].bullets[0]).toContain("Delivered");
  });

  it("does not auto-apply an unsupported ATS suggestion", () => {
    const preview = previewResumeImprovement(createEmptyResumeDocument(), {
      priority: "low",
      category: "ats",
      issue: "Add keywords.",
      evidence: "No keywords",
      recommendation: "Review the job description.",
      example: "TypeScript",
    });

    expect(preview).toBeNull();
  });
});
