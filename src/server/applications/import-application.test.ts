import { describe, expect, it, vi } from "vitest";

import { importApplication } from "./import-application";

const description = `
  Acme Labs is hiring a Senior AI Engineer in Istanbul for a hybrid full-time role.
  You will build TypeScript and Python services, deploy workloads with Docker,
  and collaborate with product teams. Experience with PostgreSQL is preferred.
`;

describe("importApplication", () => {
  it("uses URL slug facts without calling a model when description is absent", async () => {
    const fetchMock = vi.fn();
    const application = await importApplication(
      {
        method: "url",
        url: "https://www.linkedin.com/jobs/view/senior-ai-engineer-at-acme-labs-4277081132",
        description: "",
      },
      { fetchImpl: fetchMock },
    );

    expect(application.company).toBe("Acme Labs");
    expect(application.role).toBe("Senior AI Engineer");
    expect(application.source).toBe("LinkedIn");
    expect(application.applicationUrl).toBe(
      "https://www.linkedin.com/jobs/view/4277081132",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("converts Ollama structured output into editable application fields", async () => {
    const modelOutput = {
      company: "Acme Labs",
      role: "Senior AI Engineer",
      location: "Istanbul",
      workMode: "Hybrid",
      employmentType: "Full-time",
      deadline: "",
      requiredSkills: ["TypeScript", "Python", "Docker", "PostgreSQL"],
    };
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ message: { content: JSON.stringify(modelOutput) } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const application = await importApplication(
      { method: "description", url: "", description },
      {
        provider: "ollama",
        baseUrl: "http://ollama.test",
        fetchImpl: fetchMock,
      },
    );

    expect(application.company).toBe("Acme Labs");
    expect(application.requiredSkills).toContain("TypeScript");
    expect(application.description).toBe(description.trim());
    const request = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(request.think).toBe(false);
    expect(request.format.type).toBe("object");
  });
});
