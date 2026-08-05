import { describe, expect, it, vi } from "vitest";

import { createEmptyResumeDocument } from "../../lib/resume-builder/schema";
import { generateResumeMatch } from "./generate-resume-match";

const modelResult = {
  overallScore: 99,
  skillScore: 80,
  responsibilityScore: 60,
  keywordScore: 50,
  summary: "The resume covers the core frontend requirements.",
  matchedSkills: [{ skill: "React", evidence: "Built a React dashboard" }],
  missingSkills: [{ skill: "PostgreSQL", reason: "No supporting resume evidence" }],
  responsibilityMatches: [
    {
      requirement: "Build user-facing products",
      evidence: "Built a React dashboard",
      level: "strong",
    },
  ],
  matchedKeywords: ["React"],
  missingKeywords: ["PostgreSQL"],
  suggestions: [],
};

describe("generateResumeMatch", () => {
  it("uses weighted component scores instead of trusting an inflated overall score", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ message: { content: JSON.stringify(modelResult) } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const resume = {
      ...createEmptyResumeDocument(),
      summary: "Frontend developer",
      skills: ["React"],
    };

    const generated = await generateResumeMatch(
      {
        company: "Acme",
        role: "Frontend Developer",
        jobDescription: "Build React products and use PostgreSQL.",
        requiredSkills: ["React", "PostgreSQL"],
        resume,
      },
      { provider: "ollama", model: "test-model", fetchImpl },
    );

    expect(generated.result.overallScore).toBe(66);
    expect(generated.provider).toBe("ollama");
    expect(generated.model).toBe("test-model");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
