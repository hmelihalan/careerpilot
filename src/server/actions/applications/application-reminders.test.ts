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
    applicationReminder: {
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
    createApplicationReminderSchema: { safeParse: success },
    setApplicationReminderCompletionSchema: { safeParse: success },
    deleteApplicationReminderSchema: { safeParse: success },
  };
});

import {
  createApplicationReminder,
  deleteApplicationReminder,
  setApplicationReminderCompletion,
} from "./application-reminders";

describe("application reminder actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue("user-owner");
  });

  it("creates reminders only for an application owned by the user", async () => {
    mocks.findFirst.mockResolvedValue({ id: "application-1" });
    mocks.create.mockResolvedValue({ id: "reminder-1" });

    const result = await createApplicationReminder({
      slug: "acme-engineer",
      title: "Send follow-up",
      remindAt: "2026-08-05T09:00:00.000Z",
    });

    expect(result).toEqual({ success: true });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-owner", slug: "acme-engineer" },
      select: { id: true },
    });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        applicationId: "application-1",
        title: "Send follow-up",
        remindAt: new Date("2026-08-05T09:00:00.000Z"),
      },
    });
  });

  it("scopes completion and deletion through the owned application", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });

    await setApplicationReminderCompletion({
      slug: "acme-engineer",
      reminderId: "reminder-1",
      completed: true,
    });
    await deleteApplicationReminder({
      slug: "acme-engineer",
      reminderId: "reminder-1",
    });

    const ownershipFilter = {
      id: "reminder-1",
      application: { userId: "user-owner", slug: "acme-engineer" },
    };
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: ownershipFilter,
      data: { completedAt: expect.any(Date) },
    });
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: ownershipFilter });
  });
});
