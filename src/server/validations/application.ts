import "server-only";

import { z } from "zod";

import { APPLICATION_STATUS_VALUES } from "@/src/constants/application-status";

const optionalTrimmedString = (maximumLength: number) =>
  z
    .string()
    .trim()
    .max(maximumLength)
    .transform((value) => (value ? value : undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(2_048)
  .refine((value) => {
    if (!value) return true;

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a valid URL beginning with http:// or https://.")
  .transform((value) => (value ? value : undefined));

const optionalEmail = z
  .string()
  .trim()
  .max(254, "Email must be 254 characters or fewer.")
  .refine(
    (value) => !value || z.email().safeParse(value).success,
    "Enter a valid email address.",
  )
  .transform((value) => (value ? value : undefined));

const POSTGRES_INTEGER_MAX = 2_147_483_647;

function isValidDateInput(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => !value || isValidDateInput(value),
      `Enter a valid ${label}.`,
    )
    .transform((value) => (value ? value : undefined));

const optionalWholeNumber = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      if (!/^\d+$/.test(value)) return false;

      const amount = Number(value);
      return Number.isSafeInteger(amount) && amount <= POSTGRES_INTEGER_MAX;
    }, `${label} must be a whole number between 0 and 2,147,483,647.`)
    .transform((value) => (value ? Number(value) : undefined));

const applicationEditableFields = {
  company: z
    .string()
    .trim()
    .min(1, "Company is required.")
    .max(160, "Company must be 160 characters or fewer."),
  role: z
    .string()
    .trim()
    .min(1, "Role is required.")
    .max(200, "Role must be 200 characters or fewer."),
  location: optionalTrimmedString(200),
  workMode: z.enum(["Remote", "Hybrid", "On-site"]).optional().or(z.literal("")),
  employmentType: z
    .enum([
      "Internship",
      "Full-time",
      "Part-time",
      "Contract",
      "Temporary",
      "Other",
    ])
    .optional()
    .or(z.literal("")),
  source: z
    .enum([
      "LinkedIn",
      "Company website",
      "Greenhouse",
      "Lever",
      "Ashby",
      "Referral",
      "Other",
    ])
    .optional()
    .or(z.literal("")),
  applicationUrl: optionalUrl,
  deadline: optionalDate("deadline"),
  requiredSkills: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Skills cannot be empty.")
        .max(80, "Each skill must be 80 characters or fewer."),
    )
    .max(30, "Add no more than 30 skills.")
    .transform((skills) => Array.from(new Set(skills))),
  description: optionalTrimmedString(50_000),
};

export const createApplicationSchema = z
  .object({
    ...applicationEditableFields,
    status: z.enum(["Wishlist", "Applied"]),
  })
  .strict();

export const createApplicationOptionsSchema = z
  .object({
    forceCreate: z.boolean().optional().default(false),
  })
  .strict();

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type CreateApplicationOptions = z.input<
  typeof createApplicationOptionsSchema
>;

export const updateApplicationStatusSchema = z
  .object({
    slug: z.string().trim().min(1, "A valid application is required."),
    status: z.enum(APPLICATION_STATUS_VALUES),
  })
  .strict();

export type UpdateApplicationStatusInput = z.infer<
  typeof updateApplicationStatusSchema
>;

export const deleteApplicationSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, "A valid application is required.")
      .max(160, "The application identifier is invalid."),
  })
  .strict();

export type DeleteApplicationInput = z.infer<typeof deleteApplicationSchema>;

export const updateApplicationSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, "A valid application is required.")
      .max(160, "The application identifier is invalid."),
    ...applicationEditableFields,
    salaryMin: optionalWholeNumber("Minimum salary"),
    salaryMax: optionalWholeNumber("Maximum salary"),
    currency: optionalTrimmedString(10),
    appliedAt: optionalDate("application date"),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.salaryMin !== undefined &&
      data.salaryMax !== undefined &&
      data.salaryMin > data.salaryMax
    ) {
      context.addIssue({
        code: "custom",
        path: ["salaryMax"],
        message: "Maximum salary must be greater than or equal to minimum salary.",
      });
    }
  });

export type UpdateApplicationInput = z.input<typeof updateApplicationSchema>;
export type UpdateApplicationData = z.output<typeof updateApplicationSchema>;

const applicationSlug = z
  .string()
  .trim()
  .min(1, "A valid application is required.")
  .max(160, "The application identifier is invalid.");

const recordId = z
  .string()
  .trim()
  .min(1, "A valid record is required.")
  .max(100, "The record identifier is invalid.");

const noteContent = z
  .string()
  .trim()
  .min(1, "Note content is required.")
  .max(5_000, "Notes must be 5,000 characters or fewer.");

export const createApplicationNoteSchema = z
  .object({ slug: applicationSlug, content: noteContent })
  .strict();

export const updateApplicationNoteSchema = z
  .object({ slug: applicationSlug, noteId: recordId, content: noteContent })
  .strict();

export const deleteApplicationNoteSchema = z
  .object({ slug: applicationSlug, noteId: recordId })
  .strict();

const reminderTitle = z
  .string()
  .trim()
  .min(1, "Reminder title is required.")
  .max(200, "Reminder title must be 200 characters or fewer.");

const reminderDate = z
  .string()
  .datetime({ offset: true, message: "Choose a valid reminder date and time." });

export const createApplicationReminderSchema = z
  .object({
    slug: applicationSlug,
    title: reminderTitle,
    remindAt: reminderDate,
  })
  .strict();

export const setApplicationReminderCompletionSchema = z
  .object({ slug: applicationSlug, reminderId: recordId, completed: z.boolean() })
  .strict();

export const deleteApplicationReminderSchema = z
  .object({ slug: applicationSlug, reminderId: recordId })
  .strict();

export type CreateApplicationNoteInput = z.input<typeof createApplicationNoteSchema>;
export type UpdateApplicationNoteInput = z.input<typeof updateApplicationNoteSchema>;
export type DeleteApplicationNoteInput = z.input<typeof deleteApplicationNoteSchema>;
export type CreateApplicationReminderInput = z.input<
  typeof createApplicationReminderSchema
>;
export type SetApplicationReminderCompletionInput = z.input<
  typeof setApplicationReminderCompletionSchema
>;
export type DeleteApplicationReminderInput = z.input<
  typeof deleteApplicationReminderSchema
>;

const interviewTitle = z
  .string()
  .trim()
  .min(1, "Interview title is required.")
  .max(160, "Interview title must be 160 characters or fewer.");

const interviewDate = z
  .string()
  .datetime({ offset: true, message: "Choose a valid interview date and time." });

const interviewFields = {
  title: interviewTitle,
  roundNumber: z.number().int().min(1).max(20),
  scheduledAt: interviewDate,
  durationMinutes: z.number().int().min(15).max(480),
  interviewerName: optionalTrimmedString(160),
  interviewerRole: optionalTrimmedString(160),
  location: optionalTrimmedString(300),
  meetingUrl: optionalUrl,
  reminderMinutesBefore: z.number().int().min(0).max(10_080).nullable(),
};

export const createApplicationInterviewSchema = z
  .object({ slug: applicationSlug, ...interviewFields })
  .strict();

export const updateApplicationInterviewSchema = z
  .object({ slug: applicationSlug, interviewId: recordId, ...interviewFields })
  .strict();

export const setApplicationInterviewStatusSchema = z
  .object({
    slug: applicationSlug,
    interviewId: recordId,
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  })
  .strict();

export const deleteApplicationInterviewSchema = z
  .object({ slug: applicationSlug, interviewId: recordId })
  .strict();

export type CreateApplicationInterviewInput = z.input<
  typeof createApplicationInterviewSchema
>;
export type UpdateApplicationInterviewInput = z.input<
  typeof updateApplicationInterviewSchema
>;
export type SetApplicationInterviewStatusInput = z.input<
  typeof setApplicationInterviewStatusSchema
>;
export type DeleteApplicationInterviewInput = z.input<
  typeof deleteApplicationInterviewSchema
>;

const contactName = z
  .string()
  .trim()
  .min(1, "Contact name is required.")
  .max(160, "Contact name must be 160 characters or fewer.");

const optionalContactDate = z
  .string()
  .datetime({ offset: true, message: "Choose a valid date and time." })
  .nullable();

const contactFields = {
  name: contactName,
  contactType: z.enum([
    "RECRUITER",
    "HIRING_MANAGER",
    "INTERVIEWER",
    "REFERRAL",
    "OTHER",
  ]),
  role: optionalTrimmedString(160),
  email: optionalEmail,
  linkedinUrl: optionalUrl,
  lastContactedAt: optionalContactDate,
  nextFollowUpAt: optionalContactDate,
};

export const createApplicationContactSchema = z
  .object({ slug: applicationSlug, ...contactFields })
  .strict();

export const updateApplicationContactSchema = z
  .object({ slug: applicationSlug, contactId: recordId, ...contactFields })
  .strict();

export const logApplicationContactSchema = z
  .object({ slug: applicationSlug, contactId: recordId })
  .strict();

export const deleteApplicationContactSchema = z
  .object({ slug: applicationSlug, contactId: recordId })
  .strict();

export type CreateApplicationContactInput = z.input<
  typeof createApplicationContactSchema
>;
export type UpdateApplicationContactInput = z.input<
  typeof updateApplicationContactSchema
>;
export type LogApplicationContactInput = z.input<
  typeof logApplicationContactSchema
>;
export type DeleteApplicationContactInput = z.input<
  typeof deleteApplicationContactSchema
>;
