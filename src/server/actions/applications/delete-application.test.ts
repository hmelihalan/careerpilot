import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/src/lib/prisma", () => ({
  prisma: { application: { deleteMany: mocks.deleteMany } },
}));
vi.mock("@/src/server/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/src/server/validations/application", () => ({
  deleteApplicationSchema: {
    safeParse: (input: unknown) => ({ success: true, data: input }),
  },
}));

import { deleteApplication } from "./delete-application";

describe("deleteApplication ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue("user-owner");
  });

  it("uses the authenticated user id in the delete criteria", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteApplication({ slug: "acme-engineer" })).resolves.toEqual({
      success: true,
    });

    expect(mocks.requireUser).toHaveBeenCalledOnce();
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-owner",
        slug: "acme-engineer",
      },
    });
  });

  it("returns a safe not-found result when no owned row is deleted", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteApplication({ slug: "someone-elses-job" })).resolves.toEqual({
      success: false,
      reason: "not-found",
      formError: "We couldn’t find that application.",
    });

    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-owner",
        slug: "someone-elses-job",
      },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
