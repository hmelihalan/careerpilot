import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/src/lib/prisma", () => ({
  prisma: { savedResumeAnalysis: { deleteMany: mocks.deleteMany } },
}));

import { DELETE } from "./route";

describe("DELETE /api/resume-analyses/:analysisId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-owner" });
  });

  it("scopes deletion to the signed-in user", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });

    const response = await DELETE(new Request("https://app.test"), {
      params: Promise.resolve({ analysisId: "analysis-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { id: "analysis-1", userId: "user-owner" },
    });
  });

  it("returns not found without exposing another user's record", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });

    const response = await DELETE(new Request("https://app.test"), {
      params: Promise.resolve({ analysisId: "analysis-other" }),
    });

    expect(response.status).toBe(404);
  });
});
