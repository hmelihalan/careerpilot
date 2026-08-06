import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResumeDocument } from "../../../../../src/lib/resume-builder/schema";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  applicationFindFirst: vi.fn(),
  resumeFindFirst: vi.fn(),
  materialCreate: vi.fn(),
  materialFindFirst: vi.fn(),
  materialUpdate: vi.fn(),
  materialUpdateMany: vi.fn(),
  transaction: vi.fn(),
  generate: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("../../../../../src/lib/prisma", () => ({
  prisma: {
    application: { findFirst: mocks.applicationFindFirst },
    resumeDraft: { findFirst: mocks.resumeFindFirst },
    applicationMaterial: {
      create: mocks.materialCreate,
      findFirst: mocks.materialFindFirst,
      update: mocks.materialUpdate,
      updateMany: mocks.materialUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("../../../../../src/server/application-materials/generate-application-materials", () => ({
  generateApplicationMaterials: mocks.generate,
}));

import { PATCH, POST } from "./route";

const params = { params: Promise.resolve({ applicationId: "acme-engineer" }) };

describe("application material versions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-owner" });
    mocks.transaction.mockResolvedValue([]);
  });

  it("creates a new material version instead of overwriting the previous one", async () => {
    const resume = {
      ...createEmptyResumeDocument(),
      title: "Frontend CV",
      summary: "Frontend developer building React products.",
    };
    mocks.applicationFindFirst.mockResolvedValue({
      id: "application-1",
      company: "Acme",
      role: "Frontend Engineer",
      description: "Build React products.",
      requiredSkills: ["React"],
    });
    mocks.resumeFindFirst.mockResolvedValue({
      id: "resume-1",
      title: "Frontend CV",
      content: resume,
    });
    mocks.generate.mockResolvedValue({
      coverLetter: "A".repeat(200),
      followUpMessage: "B".repeat(100),
      interviewQuestions: [],
    });
    mocks.materialCreate.mockImplementation(async ({ data }) => ({
      id: "material-2",
      ...data,
      isSubmitted: false,
      submittedAt: null,
      createdAt: new Date("2026-08-06T10:00:00.000Z"),
      updatedAt: new Date("2026-08-06T10:00:00.000Z"),
    }));

    const response = await POST(
      new Request("https://app.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: "resume-1" }),
      }),
      params,
    );

    expect(response.status).toBe(201);
    expect(mocks.materialCreate).toHaveBeenCalledOnce();
    expect(mocks.materialCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationId: "application-1",
        resumeDraftId: "resume-1",
        resumeTitle: "Frontend CV",
      }),
    });
  });

  it("locks sent material versions against later edits", async () => {
    mocks.materialFindFirst.mockResolvedValue({
      id: "material-1",
      applicationId: "application-1",
      isSubmitted: true,
    });

    const response = await PATCH(
      new Request("https://app.test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          materialId: "material-1",
          kind: "coverLetter",
          content: "Updated letter",
        }),
      }),
      params,
    );

    expect(response.status).toBe(409);
    expect(mocks.materialUpdate).not.toHaveBeenCalled();
  });

  it("marks exactly one owned version as sent", async () => {
    mocks.materialFindFirst.mockResolvedValue({
      id: "material-2",
      applicationId: "application-1",
      isSubmitted: false,
    });

    const response = await PATCH(
      new Request("https://app.test", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_submitted",
          materialId: "material-2",
        }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(mocks.materialUpdateMany).toHaveBeenCalledWith({
      where: { applicationId: "application-1", isSubmitted: true },
      data: { isSubmitted: false, submittedAt: null },
    });
    expect(mocks.materialUpdate).toHaveBeenCalledWith({
      where: { id: "material-2" },
      data: { isSubmitted: true, submittedAt: expect.any(Date) },
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
});
