import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applicationFindFirst: vi.fn(),
  contactFindFirst: vi.fn(),
  contactCreate: vi.fn(),
  contactUpdate: vi.fn(),
  contactUpdateMany: vi.fn(),
  contactDelete: vi.fn(),
  reminderCreate: vi.fn(),
  reminderUpdate: vi.fn(),
  reminderDelete: vi.fn(),
  reminderDeleteMany: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/src/lib/prisma", () => {
  const transactionClient = {
    applicationContact: {
      create: mocks.contactCreate,
      update: mocks.contactUpdate,
      delete: mocks.contactDelete,
    },
    applicationReminder: {
      create: mocks.reminderCreate,
      update: mocks.reminderUpdate,
      delete: mocks.reminderDelete,
      deleteMany: mocks.reminderDeleteMany,
    },
  };
  return {
    prisma: {
      application: { findFirst: mocks.applicationFindFirst },
      applicationContact: {
        findFirst: mocks.contactFindFirst,
        updateMany: mocks.contactUpdateMany,
      },
      $transaction: mocks.transaction.mockImplementation(
        (callback: (client: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    },
  };
});
vi.mock("@/src/server/auth/require-user", () => ({
  requireUser: mocks.requireUser,
}));
vi.mock("@/src/server/validations/application", () => {
  const success = (input: unknown) => ({ success: true, data: input });
  return {
    createApplicationContactSchema: { safeParse: success },
    updateApplicationContactSchema: { safeParse: success },
    logApplicationContactSchema: { safeParse: success },
    deleteApplicationContactSchema: { safeParse: success },
  };
});

import {
  createApplicationContact,
  deleteApplicationContact,
  logApplicationContact,
  updateApplicationContact,
} from "./application-contacts";

const input = {
  slug: "acme-engineer",
  name: "Ada Recruiter",
  contactType: "RECRUITER" as const,
  role: "Senior Technical Recruiter",
  email: "ada@example.com",
  linkedinUrl: "https://www.linkedin.com/in/ada",
  lastContactedAt: "2026-08-05T09:00:00.000Z",
  nextFollowUpAt: "2026-08-12T09:00:00.000Z",
};

describe("application contact actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue("user-owner");
    mocks.transaction.mockImplementation((callback) =>
      callback({
        applicationContact: {
          create: mocks.contactCreate,
          update: mocks.contactUpdate,
          delete: mocks.contactDelete,
        },
        applicationReminder: {
          create: mocks.reminderCreate,
          update: mocks.reminderUpdate,
          delete: mocks.reminderDelete,
          deleteMany: mocks.reminderDeleteMany,
        },
      }),
    );
  });

  it("creates a contact and its follow-up reminder", async () => {
    mocks.applicationFindFirst.mockResolvedValue({ id: "application-1" });
    mocks.reminderCreate.mockResolvedValue({ id: "reminder-1" });

    expect(await createApplicationContact(input)).toEqual({ success: true });
    expect(mocks.reminderCreate).toHaveBeenCalledWith({
      data: {
        applicationId: "application-1",
        title: "Follow up with Ada Recruiter",
        remindAt: new Date(input.nextFollowUpAt),
      },
      select: { id: true },
    });
    expect(mocks.contactCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationId: "application-1",
        name: input.name,
        reminderId: "reminder-1",
      }),
    });
  });

  it("updates and reopens the linked follow-up reminder", async () => {
    mocks.contactFindFirst.mockResolvedValue({
      applicationId: "application-1",
      reminderId: "reminder-1",
    });

    expect(
      await updateApplicationContact({ ...input, contactId: "contact-1" }),
    ).toEqual({ success: true });
    expect(mocks.reminderUpdate).toHaveBeenCalledWith({
      where: { id: "reminder-1" },
      data: {
        title: "Follow up with Ada Recruiter",
        remindAt: new Date(input.nextFollowUpAt),
        completedAt: null,
      },
    });
  });

  it("logs communication and deletes only the linked reminder", async () => {
    mocks.contactUpdateMany.mockResolvedValue({ count: 1 });
    expect(
      await logApplicationContact({ slug: input.slug, contactId: "contact-1" }),
    ).toEqual({ success: true });
    expect(mocks.contactUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "contact-1",
        application: { userId: "user-owner", slug: input.slug },
      },
      data: { lastContactedAt: expect.any(Date) },
    });

    mocks.contactFindFirst.mockResolvedValue({ reminderId: "reminder-1" });
    expect(
      await deleteApplicationContact({ slug: input.slug, contactId: "contact-1" }),
    ).toEqual({ success: true });
    expect(mocks.reminderDeleteMany).toHaveBeenCalledWith({
      where: {
        id: "reminder-1",
        application: { userId: "user-owner", slug: input.slug },
      },
    });
  });
});
