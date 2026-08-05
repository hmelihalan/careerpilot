import { z } from "zod";

export const resumeMatchSuggestionSchema = z
  .object({
    category: z.enum(["summary", "experience", "skills"]),
    targetType: z.enum(["summary", "experience_bullet", "skills"]),
    experienceId: z.string().max(100),
    bulletIndex: z.number().int().min(-1).max(20),
    title: z.string().trim().min(1).max(180),
    rationale: z.string().trim().min(1).max(800),
    evidence: z.string().trim().min(1).max(1_000),
    before: z.string().max(1_000),
    after: z.string().trim().min(1).max(1_000),
  })
  .strict();

export const resumeMatchResultSchema = z
  .object({
    overallScore: z.number().int().min(0).max(100),
    skillScore: z.number().int().min(0).max(100),
    responsibilityScore: z.number().int().min(0).max(100),
    keywordScore: z.number().int().min(0).max(100),
    summary: z.string().trim().min(1).max(1_200),
    matchedSkills: z
      .array(
        z
          .object({
            skill: z.string().trim().min(1).max(120),
            evidence: z.string().trim().min(1).max(800),
          })
          .strict(),
      )
      .max(30),
    missingSkills: z
      .array(
        z
          .object({
            skill: z.string().trim().min(1).max(120),
            reason: z.string().trim().min(1).max(800),
          })
          .strict(),
      )
      .max(30),
    responsibilityMatches: z
      .array(
        z
          .object({
            requirement: z.string().trim().min(1).max(500),
            evidence: z.string().trim().min(1).max(1_000),
            level: z.enum(["strong", "partial", "missing"]),
          })
          .strict(),
      )
      .max(20),
    matchedKeywords: z.array(z.string().trim().min(1).max(120)).max(40),
    missingKeywords: z.array(z.string().trim().min(1).max(120)).max(40),
    suggestions: z.array(resumeMatchSuggestionSchema).max(12),
  })
  .strict();

export type ResumeMatchResult = z.infer<typeof resumeMatchResultSchema>;
export type ResumeMatchSuggestion = z.infer<typeof resumeMatchSuggestionSchema>;

export const resumeMatchJsonSchema = {
  type: "object",
  properties: {
    overallScore: { type: "integer", minimum: 0, maximum: 100 },
    skillScore: { type: "integer", minimum: 0, maximum: 100 },
    responsibilityScore: { type: "integer", minimum: 0, maximum: 100 },
    keywordScore: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    matchedSkills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string" },
          evidence: { type: "string" },
        },
        required: ["skill", "evidence"],
        additionalProperties: false,
      },
    },
    missingSkills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string" },
          reason: { type: "string" },
        },
        required: ["skill", "reason"],
        additionalProperties: false,
      },
    },
    responsibilityMatches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement: { type: "string" },
          evidence: { type: "string" },
          level: { type: "string", enum: ["strong", "partial", "missing"] },
        },
        required: ["requirement", "evidence", "level"],
        additionalProperties: false,
      },
    },
    matchedKeywords: { type: "array", items: { type: "string" } },
    missingKeywords: { type: "array", items: { type: "string" } },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["summary", "experience", "skills"] },
          targetType: {
            type: "string",
            enum: ["summary", "experience_bullet", "skills"],
          },
          experienceId: { type: "string" },
          bulletIndex: { type: "integer" },
          title: { type: "string" },
          rationale: { type: "string" },
          evidence: { type: "string" },
          before: { type: "string" },
          after: { type: "string" },
        },
        required: [
          "category",
          "targetType",
          "experienceId",
          "bulletIndex",
          "title",
          "rationale",
          "evidence",
          "before",
          "after",
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    "overallScore",
    "skillScore",
    "responsibilityScore",
    "keywordScore",
    "summary",
    "matchedSkills",
    "missingSkills",
    "responsibilityMatches",
    "matchedKeywords",
    "missingKeywords",
    "suggestions",
  ],
  additionalProperties: false,
} as const;
