import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Resume as PrismaResumeRecord } from "@/src/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    resume: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
    },
  },
}));
vi.mock("@/src/server/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));

import { getResumeForCurrentUser } from "./get-resume";
import { getResumesForCurrentUser } from "./get-resumes";
import { toResumeListItem } from "./resume-mappings";

const createdAt = new Date("2026-07-01T12:00:00.000Z");
const updatedAt = new Date("2026-07-20T12:00:00.000Z");

function createResumeRecord(
  overrides: Partial<PrismaResumeRecord> = {},
): PrismaResumeRecord {
  return {
    id: "resume-owned",
    userId: "user-owner",
    name: "Software Engineering Resume",
    originalName: "software-engineer.pdf",
    blobPathname: "users/user-owner/resumes/software-engineer.pdf",
    mimeType: "application/pdf",
    sizeBytes: 245_760,
    isDefault: true,
    parseStatus: "READY",
    parseError: "internal parse detail",
    extractedText: "private extracted resume text",
    parsedData: { private: true },
    createdAt,
    updatedAt,
    ...overrides,
  };
}

describe("Resume ownership queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue("user-owner");
  });

  it("lists only the authenticated user's resumes in default-first order", async () => {
    mocks.findMany.mockResolvedValue([
      createResumeRecord(),
      createResumeRecord({
        id: "resume-secondary",
        isDefault: false,
        updatedAt: new Date("2026-07-21T12:00:00.000Z"),
      }),
    ]);

    await expect(getResumesForCurrentUser()).resolves.toHaveLength(2);

    expect(mocks.requireUser).toHaveBeenCalledOnce();
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { userId: "user-owner" },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  });

  it("cannot retrieve a resume without matching authenticated ownership", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(
      getResumeForCurrentUser("resume-belonging-to-another-user"),
    ).resolves.toBeNull();

    expect(mocks.requireUser).toHaveBeenCalledOnce();
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: "resume-belonging-to-another-user",
        userId: "user-owner",
      },
    });
  });
});

describe("Resume list mapping", () => {
  it("exposes only fields required by the list UI", () => {
    const mapped = toResumeListItem(createResumeRecord());

    expect(mapped).toEqual({
      id: "resume-owned",
      name: "Software Engineering Resume",
      originalName: "software-engineer.pdf",
      mimeType: "application/pdf",
      sizeBytes: 245_760,
      isDefault: true,
      parseStatus: "READY",
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
    expect(mapped).not.toHaveProperty("blobPathname");
    expect(mapped).not.toHaveProperty("extractedText");
    expect(mapped).not.toHaveProperty("parsedData");
    expect(mapped).not.toHaveProperty("parseError");
  });
});
