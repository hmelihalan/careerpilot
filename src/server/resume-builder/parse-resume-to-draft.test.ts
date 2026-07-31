import { afterEach, describe, expect, it, vi } from "vitest";

import { parseResumeToDraft } from "./parse-resume-to-draft";

const modelOutput = {
  language: "en",
  contact: {
    fullName: "Ada Lovelace",
    headline: "Software Engineer",
    email: "ada@example.com",
    phone: "",
    location: "London",
    website: "",
    linkedin: "",
  },
  summary: "Builds reliable software products.",
  experience: [],
  education: [],
  skills: ["TypeScript"],
  projects: [],
  certifications: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESUME_ANALYSIS_PROVIDER;
  delete process.env.OLLAMA_BASE_URL;
});

describe("parseResumeToDraft", () => {
  it("converts Ollama structured output into a builder draft", async () => {
    process.env.RESUME_ANALYSIS_PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = "http://ollama.test";
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ message: { content: JSON.stringify(modelOutput) } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const draft = await parseResumeToDraft(
      "Ada Lovelace — Software Engineer — TypeScript",
      "ada-resume.pdf",
    );

    expect(draft.title).toBe("ada-resume");
    expect(draft.contact.fullName).toBe("Ada Lovelace");
    expect(draft.skills).toEqual(["TypeScript"]);
    const request = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(request.think).toBe(false);
    expect(request.format.type).toBe("object");
  });
});
