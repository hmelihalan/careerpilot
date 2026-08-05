import { describe, expect, it } from "vitest";

import { applyAcceptedResumeMatchSuggestions } from "./apply-suggestions";
import type { ResumeMatchResult } from "./schema";
import { createEmptyResumeDocument } from "../resume-builder/schema";

const result: ResumeMatchResult = {
  overallScore: 70,
  skillScore: 70,
  responsibilityScore: 70,
  keywordScore: 70,
  summary: "Good base.",
  matchedSkills: [],
  missingSkills: [],
  responsibilityMatches: [],
  matchedKeywords: [],
  missingKeywords: [],
  suggestions: [
    {
      category: "summary",
      targetType: "summary",
      experienceId: "",
      bulletIndex: -1,
      title: "Target the summary",
      rationale: "Lead with relevant work.",
      evidence: "React developer",
      before: "React developer",
      after: "React developer focused on accessible products",
    },
    {
      category: "experience",
      targetType: "experience_bullet",
      experienceId: "exp-1",
      bulletIndex: 0,
      title: "Clarify ownership",
      rationale: "Matches the role.",
      evidence: "Built a React dashboard",
      before: "Built a React dashboard",
      after: "Built and shipped a React dashboard for internal teams",
    },
  ],
};

describe("applyAcceptedResumeMatchSuggestions", () => {
  it("applies only accepted suggestions against the immutable source", () => {
    const source = {
      ...createEmptyResumeDocument(),
      summary: "React developer",
      experience: [
        {
          id: "exp-1",
          role: "Developer",
          company: "Acme",
          location: "",
          startDate: "2025",
          endDate: "",
          current: true,
          bullets: ["Built a React dashboard"],
        },
      ],
    };

    const tailored = applyAcceptedResumeMatchSuggestions(source, result, [1]);

    expect(tailored.draft.summary).toBe("React developer");
    expect(tailored.draft.experience[0].bullets[0]).toContain("shipped");
    expect(tailored.changes).toHaveLength(1);
    expect(source.experience[0].bullets[0]).toBe("Built a React dashboard");
  });

  it("skips a suggestion when its source text no longer matches", () => {
    const source = { ...createEmptyResumeDocument(), summary: "Different text" };
    const tailored = applyAcceptedResumeMatchSuggestions(source, result, [0]);
    expect(tailored.changes).toEqual([]);
    expect(tailored.draft.summary).toBe("Different text");
  });
});
