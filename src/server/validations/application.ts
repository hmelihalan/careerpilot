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

const optionalDate = z
  .string()
  .trim()
  .refine(
    (value) =>
      !value ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))),
    "Enter a valid deadline.",
  )
  .transform((value) => (value ? value : undefined));

export const createApplicationSchema = z.object({
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
    .enum(["Internship", "Full-time", "Part-time", "Contract"])
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
  deadline: optionalDate,
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
  status: z.enum(["Wishlist", "Applied"]),
}).strict();

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
