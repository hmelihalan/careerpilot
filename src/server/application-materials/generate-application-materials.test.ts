import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmptyResumeDocument } from "../../lib/resume-builder/schema";
import {
  generateApplicationMaterials,
} from "./generate-application-materials";

const questions = ["Technical", "Behavioral", "Company-Specific"].flatMap(
  (category) =>
    [1, 2, 3].map((number) => ({
      category,
      difficulty: number === 1 ? "Easy" : number === 2 ? "Medium" : "Hard",
      question: `${category} question ${number}?`,
      guidance: `Use a real resume example for ${category.toLowerCase()} answer ${number}.`,
    })),
);

const generated = {
  coverLetter:
    "Dear Hiring Team,\n\nI am applying for the Software Engineer role. My resume shows hands-on TypeScript and React experience through relevant projects. I would welcome the opportunity to bring this background, a careful engineering approach, and a strong willingness to learn to your team. Thank you for considering my application.\n\nSincerely,\nAda Example",
  followUpMessage:
    "Subject: Software Engineer application follow-up\n\nHello Hiring Team, I am following up on my application for the Software Engineer role. My TypeScript and React project experience aligns with the role, and I remain very interested in the opportunity. Thank you for your time and consideration.\n\nBest,\nAda Example",
  interviewQuestions: questions,
};

function testResume() {
  const resume = createEmptyResumeDocument();
  resume.title = "Frontend Resume";
  resume.contact.fullName = "Ada Example";
  resume.contact.headline = "Software Engineer";
  resume.summary = "Software engineer building accessible web products.";
  resume.skills = ["TypeScript", "React"];
  return resume;
}

afterEach(() => vi.restoreAllMocks());

describe("generateApplicationMaterials", () => {
  it("uses Groq structured output and returns validated materials", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(generated) } }],
        }),
        { status: 200 },
      ),
    );

    const result = await generateApplicationMaterials(
      {
        company: "Acme",
        role: "Software Engineer",
        jobDescription: "Build accessible React applications with TypeScript.",
        requiredSkills: ["React", "TypeScript"],
        resume: testResume(),
      },
      {
        provider: "groq",
        apiKey: "test-key",
        baseUrl: "https://groq.test/openai/v1",
        model: "test-model",
        fetchImpl,
      },
    );

    expect(result).toEqual(generated);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://groq.test/openai/v1/chat/completions",
    );
    const request = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(request.response_format.json_schema.name).toBe("application_materials");
    expect(JSON.stringify(request.messages)).toContain("Ada Example");
    expect(JSON.stringify(request.messages)).toContain("Acme");
  });

  it("uses the Ollama chat endpoint without sending an API key", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ message: { content: JSON.stringify(generated) } }),
        { status: 200 },
      ),
    );

    await generateApplicationMaterials(
      {
        company: "Acme",
        role: "Software Engineer",
        jobDescription: "Build web applications.",
        requiredSkills: [],
        resume: testResume(),
      },
      { provider: "ollama", baseUrl: "http://ollama.test", fetchImpl },
    );

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("http://ollama.test/api/chat");
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("rejects output without three questions in every category", async () => {
    const invalid = {
      ...generated,
      interviewQuestions: questions.map((question) => ({
        ...question,
        category: "Technical",
      })),
    };
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ message: { content: JSON.stringify(invalid) } }),
        { status: 200 },
      ),
    );

    await expect(
      generateApplicationMaterials(
        {
          company: "Acme",
          role: "Software Engineer",
          jobDescription: "Build web applications.",
          requiredSkills: [],
          resume: testResume(),
        },
        { provider: "ollama", baseUrl: "http://ollama.test", fetchImpl },
      ),
    ).rejects.toMatchObject({ code: "invalid_model_output" });
  });
});
