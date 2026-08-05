import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applicationFindFirst: vi.fn(),
  interviewFindFirst: vi.fn(),
  interviewCreate: vi.fn(),
  interviewUpdate: vi.fn(),
  interviewDelete: vi.fn(),
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
    applicationInterview: {
      create: mocks.interviewCreate,
      update: mocks.interviewUpdate,
      delete: mocks.interviewDelete,
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
      applicationInterview: { findFirst: mocks.interviewFindFirst },
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
    createApplicationInterviewSchema: { safeParse: success },
    updateApplicationInterviewSchema: { safeParse: success },
    setApplicationInterviewStatusSchema: { safeParse: success },
    deleteApplicationInterviewSchema: { safeParse: success },
  };
});

import {
  createApplicationInterview,
  deleteApplicationInterview,
  setApplicationInterviewStatus,
  updateApplicationInterview,
} from "./application-interviews";

const input = {
  slug: "acme-engineer",
  title: "Technical interview",
  roundNumber: 2,
  scheduledAt: "2026-08-10T11:00:00.000Z",
  durationMinutes: 60,
  interviewerName: "Ada Recruiter",
  interviewerRole: "Engineering Manager",
  location: "Google Meet",
  meetingUrl: "https://meet.google.com/example",
  reminderMinutesBefore: 1_440,
};

describe("application interview actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue("user-owner");
    mocks.transaction.mockImplementation((callback) =>
      callback({
        applicationInterview: {
          create: mocks.interviewCreate,
          update: mocks.interviewUpdate,
          delete: mocks.interviewDelete,
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

  it("creates and links an automatic reminder", async () => {
    mocks.applicationFindFirst.mockResolvedValue({ id: "application-1" });
    mocks.reminderCreate.mockResolvedValue({ id: "reminder-1" });

    expect(await createApplicationInterview(input)).toEqual({ success: true });
    expect(mocks.reminderCreate).toHaveBeenCalledWith({
      data: {
        applicationId: "application-1",
        title: "Interview reminder: Technical interview",
        remindAt: new Date("2026-08-09T11:00:00.000Z"),
      },
      select: { id: true },
    });
    expect(mocks.interviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        applicationId: "application-1",
        reminderId: "reminder-1",
        scheduledAt: new Date("2026-08-10T11:00:00.000Z"),
      }),
    });
  });

  it("updates the linked reminder when the interview changes", async () => {
    mocks.interviewFindFirst.mockResolvedValue({
      applicationId: "application-1",
      reminderId: "reminder-1",
    });

    expect(
      await updateApplicationInterview({ ...input, interviewId: "interview-1" }),
    ).toEqual({ success: true });
    expect(mocks.reminderUpdate).toHaveBeenCalledWith({
      where: { id: "reminder-1" },
      data: {
        title: "Interview reminder: Technical interview",
        remindAt: new Date("2026-08-09T11:00:00.000Z"),
        completedAt: null,
      },
    });
  });

  it("completes linked reminders and deletes only the interview reminder", async () => {
    mocks.interviewFindFirst.mockResolvedValue({ reminderId: "reminder-1" });

    expect(
      await setApplicationInterviewStatus({
        slug: input.slug,
        interviewId: "interview-1",
        status: "COMPLETED",
      }),
    ).toEqual({ success: true });
    expect(mocks.reminderUpdate).toHaveBeenCalledWith({
      where: { id: "reminder-1" },
      data: { completedAt: expect.any(Date) },
    });

    expect(
      await deleteApplicationInterview({
        slug: input.slug,
        interviewId: "interview-1",
      }),
    ).toEqual({ success: true });
    expect(mocks.reminderDeleteMany).toHaveBeenCalledWith({
      where: {
        id: "reminder-1",
        application: { userId: "user-owner", slug: input.slug },
      },
    });
  });
});
