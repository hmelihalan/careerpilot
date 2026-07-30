import { describe, expect, it, vi } from "vitest";

import {
  analyzeResumeText,
  ResumeAnalysisServiceError,
} from "./analyze-resume";

const validAnalysis = {
  overallScore: 72,
  summary: "A focused resume with opportunities to show more impact.",
  profile: {
    targetRole: "Software Engineer",
    seniority: "mid",
    experienceYears: 3,
  },
  strengths: [
    {
      title: "Relevant role",
      evidence: "Software Engineer",
      whyItMatters: "The target role is clear.",
    },
    {
      title: "Useful skills",
      evidence: "TypeScript and PostgreSQL",
      whyItMatters: "The stack is relevant.",
    },
  ],
  improvements: [
    {
      priority: "high",
      category: "impact",
      issue: "Impact is unclear.",
      evidence: "Built APIs",
      recommendation: "Explain the business or technical result.",
      example: "Built APIs supporting the customer onboarding workflow.",
    },
    {
      priority: "medium",
      category: "ats",
      issue: "Testing is not mentioned.",
      evidence: "No testing tools are listed.",
      recommendation: "Add testing tools only if used.",
      example: "",
    },
    {
      priority: "low",
      category: "clarity",
      issue: "The summary is broad.",
      evidence: "Experienced developer",
      recommendation: "Specify the main backend specialization.",
      example: "Backend engineer focused on TypeScript services.",
    },
  ],
  sectionScores: {
    contact: { score: 90, feedback: "Clear." },
    summary: { score: 60, feedback: "Too broad." },
    experience: { score: 70, feedback: "Add outcomes." },
    education: { score: 75, feedback: "Readable." },
    skills: { score: 72, feedback: "Relevant." },
  },
  ats: {
    score: 68,
    formattingWarnings: [],
    keywordSuggestions: ["testing"],
  },
  extracted: {
    skills: ["TypeScript", "PostgreSQL"],
    roles: ["Software Engineer"],
    education: [],
  },
  ocrWarnings: [],
};

describe("analyzeResumeText", () => {
  it("requests a structured local analysis and validates the response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: { content: JSON.stringify(validAnalysis) },
        }),
        { status: 200 },
      ),
    );

    const result = await analyzeResumeText("Software Engineer\nBuilt APIs", {
      baseUrl: "http://ollama.test/",
      fetchImpl,
      model: "test-model",
      provider: "ollama",
    });

    expect(result).toEqual(validAnalysis);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://ollama.test/api/chat");
    const body = JSON.parse(request.body);
    expect(body.model).toBe("test-model");
    expect(body.stream).toBe(false);
    expect(body.format.type).toBe("object");
    expect(body.messages[1].content).toContain("<resume>");
  });

  it("requests schema-constrained analysis from Groq", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: JSON.stringify(validAnalysis) },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await analyzeResumeText("Software Engineer\nBuilt APIs", {
      apiKey: "groq-test-key",
      baseUrl: "https://groq.test/openai/v1/",
      fetchImpl,
      model: "test-groq-model",
      provider: "groq",
    });

    expect(result).toEqual(validAnalysis);
    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://groq.test/openai/v1/chat/completions");
    expect(request.headers.Authorization).toBe("Bearer groq-test-key");
    const body = JSON.parse(request.body);
    expect(body.model).toBe("test-groq-model");
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.type).toBe("object");
  });

  it("requires a Groq key before making a cloud request", async () => {
    const fetchImpl = vi.fn();

    await expect(
      analyzeResumeText("Software Engineer", {
        apiKey: "",
        fetchImpl,
        provider: "groq",
      }),
    ).rejects.toMatchObject<Partial<ResumeAnalysisServiceError>>({
      code: "provider_not_configured",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects empty resume text before calling the model", async () => {
    const fetchImpl = vi.fn();

    await expect(
      analyzeResumeText("   ", { fetchImpl }),
    ).rejects.toMatchObject<Partial<ResumeAnalysisServiceError>>({
      code: "empty_text",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns a stable error when the configured provider is unavailable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(
      analyzeResumeText("Software Engineer", {
        fetchImpl,
        provider: "ollama",
      }),
    ).rejects.toMatchObject<Partial<ResumeAnalysisServiceError>>({
      code: "provider_unavailable",
    });
  });

  it("turns provider rate limits into a retryable error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    await expect(
      analyzeResumeText("Software Engineer", {
        apiKey: "groq-test-key",
        fetchImpl,
        provider: "groq",
      }),
    ).rejects.toMatchObject<Partial<ResumeAnalysisServiceError>>({
      code: "rate_limited",
    });
  });
});
