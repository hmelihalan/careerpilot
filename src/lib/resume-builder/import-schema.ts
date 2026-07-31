import { z } from "zod";

import type { ResumeDocument } from "@/src/lib/resume-builder/schema";

const shortText = z.string().max(300);
const longText = z.string().max(2_000);

export const importedResumeSchema = z
  .object({
    language: z.enum(["en", "tr"]),
    contact: z
      .object({
        fullName: shortText,
        headline: shortText,
        email: shortText,
        phone: shortText,
        location: shortText,
        website: shortText,
        linkedin: shortText,
      })
      .strict(),
    summary: longText,
    experience: z.array(
      z
        .object({
          role: shortText,
          company: shortText,
          location: shortText,
          startDate: z.string().max(60),
          endDate: z.string().max(60),
          current: z.boolean(),
          bullets: z.array(z.string().max(1_000)).max(8),
        })
        .strict(),
    ).max(12),
    education: z.array(
      z
        .object({
          school: shortText,
          degree: shortText,
          location: shortText,
          startDate: z.string().max(60),
          endDate: z.string().max(60),
          details: longText,
        })
        .strict(),
    ).max(8),
    skills: z.array(z.string().max(100)).max(40),
    projects: z.array(
      z
        .object({
          name: shortText,
          link: z.string().max(500),
          description: longText,
        })
        .strict(),
    ).max(10),
    certifications: z.array(
      z
        .object({
          name: shortText,
          issuer: shortText,
          date: z.string().max(60),
        })
        .strict(),
    ).max(12),
  })
  .strict();

export type ImportedResume = z.infer<typeof importedResumeSchema>;

function createEntryId(prefix: string, index: number): string {
  return `${prefix}-${index}-${crypto.randomUUID()}`;
}

export function toResumeDocument(
  imported: ImportedResume,
  fileName: string,
): ResumeDocument {
  const title = fileName.replace(/\.[^.]+$/, "").trim() || "Imported Resume";

  return {
    version: 1,
    title: title.slice(0, 120),
    language: imported.language,
    contact: imported.contact,
    summary: imported.summary,
    experience: imported.experience.map((item, index) => ({
      ...item,
      id: createEntryId("experience", index),
    })),
    education: imported.education.map((item, index) => ({
      ...item,
      id: createEntryId("education", index),
    })),
    skills: imported.skills,
    projects: imported.projects.map((item, index) => ({
      ...item,
      id: createEntryId("project", index),
    })),
    certifications: imported.certifications.map((item, index) => ({
      ...item,
      id: createEntryId("certification", index),
    })),
  };
}

export const importedResumeJsonSchema = z.toJSONSchema(importedResumeSchema, {
  target: "draft-07",
});
