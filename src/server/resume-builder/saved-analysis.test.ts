import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  requireUser: vi.fn(),
  analysis: {
    overallScore: 82,
    profile: { targetRole: "Frontend Engineer" },
    summary: "Strong frontend profile.",
    improvements: [{ issue: "Add impact" }],
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/generated/prisma/client", () => ({
  Prisma: { DbNull: null },
}));
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    savedResumeAnalysis: {
      create: mocks.create,
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
    },
  },
}));
vi.mock("@/src/lib/resume-analysis/schema", () => ({
  resumeAnalysisSchema: {
    safeParse: () => ({ success: true, data: mocks.analysis }),
  },
}));
vi.mock("@/src/lib/resume-builder/schema", () => ({
  resumeDocumentSchema: {
    safeParse: () => ({ success: false }),
  },
}));
vi.mock("@/src/server/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));

import {
  getSavedResumeAnalysesForCurrentUser,
  getSavedResumeAnalysisForCurrentUser,
  saveResumeAnalysis,
} from "./saved-analysis";

function savedRecord(id: string) {
  return {
    id,
    fileName: `${id}.pdf`,
    originalFileSize: 1_024,
    originalMimeType: "application/pdf",
    provider: "groq",
    model: "test-model",
    characterCount: 2_000,
    analysis: {},
    importedDraft: null,
    appliedImprovementIndexes: [],
    draftImportedAt: null,
    createdAt: new Date("2026-08-04T10:00:00.000Z"),
    updatedAt: new Date("2026-08-04T10:05:00.000Z"),
  };
}

describe("saved resume analysis history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue("user-owner");
  });

  it("creates a new row for every analyzed upload", async () => {
    mocks.create.mockResolvedValue({ id: "analysis-new" });
    const originalFile = new Uint8Array([1, 2, 3]);

    await saveResumeAnalysis({
      userId: "user-owner",
      fileName: "resume.txt",
      analysis: {} as never,
      importedDraft: null,
      originalFile,
      originalMimeType: "text/plain",
      provider: "ollama",
      model: "qwen-test",
      characterCount: 123,
    });

    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-owner",
        fileName: "resume.txt",
        originalFile,
        originalMimeType: "text/plain",
        originalFileSize: 3,
        provider: "ollama",
        model: "qwen-test",
        characterCount: 123,
      }),
      select: { id: true },
    });
  });

  it("loads a requested historical analysis within the current user scope", async () => {
    mocks.findFirst.mockResolvedValue(savedRecord("analysis-old"));

    const result = await getSavedResumeAnalysisForCurrentUser("analysis-old");

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "analysis-old", userId: "user-owner" },
        orderBy: undefined,
      }),
    );
    expect(result).toMatchObject({
      id: "analysis-old",
      hasOriginalFile: true,
      hasOriginalPdf: true,
      provider: "groq",
      characterCount: 2_000,
    });
  });

  it("lists every valid analysis newest first", async () => {
    mocks.findMany.mockResolvedValue([
      savedRecord("analysis-new"),
      savedRecord("analysis-old"),
    ]);

    const result = await getSavedResumeAnalysesForCurrentUser();

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-owner" },
        orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      }),
    );
    expect(result.map((analysis) => analysis.id)).toEqual([
      "analysis-new",
      "analysis-old",
    ]);
  });
});
