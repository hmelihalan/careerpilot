import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/src/constants/application-status", () => ({
  APPLICATION_STATUS_VALUES: [
    "WISHLIST",
    "APPLIED",
    "ASSESSMENT",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
  ],
}));

import {
  createApplicationNoteSchema,
  createApplicationInterviewSchema,
  createApplicationReminderSchema,
  setApplicationReminderCompletionSchema,
} from "./application";

describe("application note and reminder validation", () => {
  it("trims valid note content", () => {
    expect(
      createApplicationNoteSchema.parse({
        slug: "acme-engineer",
        content: "  Recruiter prefers email.  ",
      }),
    ).toEqual({
      slug: "acme-engineer",
      content: "Recruiter prefers email.",
    });
  });

  it("rejects blank and oversized notes", () => {
    expect(
      createApplicationNoteSchema.safeParse({ slug: "acme", content: "   " })
        .success,
    ).toBe(false);
    expect(
      createApplicationNoteSchema.safeParse({
        slug: "acme",
        content: "a".repeat(5_001),
      }).success,
    ).toBe(false);
  });

  it("accepts offset-aware reminder timestamps", () => {
    expect(
      createApplicationReminderSchema.safeParse({
        slug: "acme-engineer",
        title: "Send follow-up",
        remindAt: "2026-08-05T09:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects timezone-less reminder timestamps and non-boolean completion", () => {
    expect(
      createApplicationReminderSchema.safeParse({
        slug: "acme-engineer",
        title: "Send follow-up",
        remindAt: "2026-08-05T09:00",
      }).success,
    ).toBe(false);
    expect(
      setApplicationReminderCompletionSchema.safeParse({
        slug: "acme-engineer",
        reminderId: "reminder-1",
        completed: "yes",
      }).success,
    ).toBe(false);
  });

  it("validates interview scheduling fields and optional reminders", () => {
    const valid = {
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
    expect(createApplicationInterviewSchema.safeParse(valid).success).toBe(true);
    expect(
      createApplicationInterviewSchema.safeParse({
        ...valid,
        scheduledAt: "2026-08-10T11:00",
      }).success,
    ).toBe(false);
    expect(
      createApplicationInterviewSchema.safeParse({
        ...valid,
        meetingUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
});
