import { describe, expect, it } from "vitest";

import { matchEvidenceAcrossPages } from "./pdf-highlights";

describe("matchEvidenceAcrossPages", () => {
  it("matches evidence to one best page and text window", () => {
    const matches = matchEvidenceAcrossPages(
      [
        [{ str: "Contact and education" }],
        [
          { str: "Built accessible" },
          { str: "React components" },
          { str: "for the product" },
        ],
      ],
      [
        {
          priority: "high",
          category: "experience",
          issue: "Show the outcome.",
          evidence: "Built accessible React components for the product",
          recommendation: "Add the result.",
          example: "Delivered accessible React components.",
        },
      ],
    );

    expect(matches[0]).toHaveLength(0);
    expect(matches[1][0].itemIndexes).toEqual([0, 1, 2]);
  });

  it("does not highlight weak one-word coincidences", () => {
    const matches = matchEvidenceAcrossPages(
      [[{ str: "React" }]],
      [
        {
          priority: "low",
          category: "skills",
          issue: "Clarify the skills section.",
          evidence: "React TypeScript testing architecture",
          recommendation: "Group related skills.",
          example: "",
        },
      ],
    );

    expect(matches[0]).toHaveLength(0);
  });
});
