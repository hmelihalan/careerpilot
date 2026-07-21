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
