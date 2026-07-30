import { describe, expect, it } from "vitest";

import { resumeAnalysisSchema } from "./schema";

const validAnalysis = {
  overallScore: 76,
  summary: "Clear experience with room for stronger quantified impact.",
  profile: {
    targetRole: "Backend Developer",
    seniority: "mid",
    experienceYears: 4,
  },
  strengths: [
    {
      title: "Relevant experience",
      evidence: "Backend Developer at Acme",
      whyItMatters: "Shows role alignment.",
    },
    {
      title: "Technical breadth",
      evidence: "Node.js, PostgreSQL",
      whyItMatters: "Covers core backend tools.",
    },
  ],
  improvements: [
    {
      priority: "high",
      category: "impact",
      issue: "Bullets describe duties without outcomes.",
      evidence: "Developed API endpoints",
      recommendation: "Add the result and scale where supported.",
      example: "Developed API endpoints that supported the billing workflow.",
    },
    {
      priority: "medium",
      category: "clarity",
      issue: "The summary is generic.",
      evidence: "Hard-working developer",
      recommendation: "Name the target role and strongest specialization.",
      example: "Backend developer focused on Node.js services.",
    },
    {
      priority: "low",
      category: "structure",
      issue: "Skills are spread across multiple sections.",
      evidence: "Node.js appears in experience and projects.",
      recommendation: "Add a concise technical skills section.",
      example: "Skills: Node.js, TypeScript, PostgreSQL",
    },
  ],
  sectionScores: {
    contact: { score: 90, feedback: "Contact details are clear." },
    summary: { score: 60, feedback: "Make the summary more specific." },
    experience: { score: 78, feedback: "Relevant but needs more outcomes." },
    education: { score: 80, feedback: "Education is easy to scan." },
    skills: { score: 72, feedback: "Consolidate technical skills." },
  },
  ats: {
    score: 74,
    formattingWarnings: [],
    keywordSuggestions: ["REST APIs", "automated testing"],
  },
  extracted: {
    skills: ["Node.js", "TypeScript", "PostgreSQL"],
    roles: ["Backend Developer"],
    education: ["BSc Computer Science"],
  },
  ocrWarnings: [],
};

describe("resumeAnalysisSchema", () => {
  it("accepts a complete grounded analysis", () => {
    expect(resumeAnalysisSchema.parse(validAnalysis)).toEqual(validAnalysis);
  });

  it("rejects scores outside the supported range", () => {
    expect(() =>
      resumeAnalysisSchema.parse({ ...validAnalysis, overallScore: 120 }),
    ).toThrow();
  });
});
