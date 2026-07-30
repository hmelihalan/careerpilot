import { z } from "zod";

const scoredFeedbackSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(1).max(600),
});

export const resumeAnalysisSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(1200),
  profile: z.object({
    targetRole: z.string().min(1).max(160),
    seniority: z.enum(["entry", "mid", "senior", "lead", "executive", "unknown"]),
    experienceYears: z.number().min(0).max(60).nullable(),
  }),
  strengths: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        evidence: z.string().min(1).max(500),
        whyItMatters: z.string().min(1).max(500),
      }),
    )
    .min(2)
    .max(6),
  improvements: z
    .array(
      z.object({
        priority: z.enum(["high", "medium", "low"]),
        category: z.enum([
          "clarity",
          "impact",
          "structure",
          "skills",
          "experience",
          "education",
          "contact",
          "ats",
          "language",
        ]),
        issue: z.string().min(1).max(400),
        evidence: z.string().min(1).max(500),
        recommendation: z.string().min(1).max(700),
        example: z.string().max(700),
      }),
    )
    .min(3)
    .max(10),
  sectionScores: z.object({
    contact: scoredFeedbackSchema,
    summary: scoredFeedbackSchema,
    experience: scoredFeedbackSchema,
    education: scoredFeedbackSchema,
    skills: scoredFeedbackSchema,
  }),
  ats: z.object({
    score: z.number().int().min(0).max(100),
    formattingWarnings: z.array(z.string().min(1).max(300)).max(8),
    keywordSuggestions: z.array(z.string().min(1).max(100)).max(12),
  }),
  extracted: z.object({
    skills: z.array(z.string().min(1).max(100)).max(30),
    roles: z.array(z.string().min(1).max(160)).max(15),
    education: z.array(z.string().min(1).max(200)).max(10),
  }),
  ocrWarnings: z
    .array(
      z.object({
        sourceText: z.string().min(1).max(300),
        suggestedReading: z.string().min(1).max(300),
        reason: z.string().min(1).max(300),
      }),
    )
    .max(20),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;

export const resumeAnalysisJsonSchema = z.toJSONSchema(resumeAnalysisSchema, {
  target: "draft-07",
});
