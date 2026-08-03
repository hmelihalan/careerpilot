import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    application: { findFirst: mocks.findFirst },
    applicationNote: {
      create: mocks.create,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
  },
}));
vi.mock("@/src/server/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/src/server/validations/application", () => {
  const success = (input: unknown) => ({ success: true, data: input });
  return {
    createApplicationNoteSchema: { safeParse: success },
    updateApplicationNoteSchema: { safeParse: success },
    deleteApplicationNoteSchema: { safeParse: success },
  };
});

import {
  createApplicationNote,
  deleteApplicationNote,
  updateApplicationNote,
} from "./application-notes";

describe("application note actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue("user-owner");
  });

  it("creates notes only after finding an application owned by the user", async () => {
    mocks.findFirst.mockResolvedValue({ id: "application-1" });
    mocks.create.mockResolvedValue({ id: "note-1" });

    await expect(
      createApplicationNote({ slug: "acme-engineer", content: "Follow up Friday" }),
    ).resolves.toEqual({ success: true });

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-owner", slug: "acme-engineer" },
      select: { id: true },
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: { applicationId: "application-1", content: "Follow up Friday" },
    });
  });

  it("does not create a note for an application the user does not own", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const result = await createApplicationNote({
      slug: "someone-elses-job",
      content: "Private note",
    });

    expect(result.success).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("scopes note updates and deletes through the owned application", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });

    await updateApplicationNote({
      slug: "acme-engineer",
      noteId: "note-1",
      content: "Updated note",
    });
    await deleteApplicationNote({
      slug: "acme-engineer",
      noteId: "note-1",
    });

    const ownershipFilter = {
      id: "note-1",
      application: { userId: "user-owner", slug: "acme-engineer" },
    };
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: ownershipFilter,
      data: { content: "Updated note" },
    });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: ownershipFilter });
  });
});
