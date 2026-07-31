import { z } from "zod";

const shortText = z.string().max(160);
const longText = z.string().max(2_000);
const entryId = z.string().min(1).max(100);

export const resumeLanguageSchema = z.enum(["en", "tr"]);

const experienceSchema = z
  .object({
    id: entryId,
    role: shortText,
    company: shortText,
    location: shortText,
    startDate: z.string().max(30),
    endDate: z.string().max(30),
    current: z.boolean(),
    bullets: z.array(z.string().max(500)).max(8),
  })
  .strict();

const educationSchema = z
  .object({
    id: entryId,
    school: shortText,
    degree: shortText,
    location: shortText,
    startDate: z.string().max(30),
    endDate: z.string().max(30),
    details: longText,
  })
  .strict();

const projectSchema = z
  .object({
    id: entryId,
    name: shortText,
    link: z.string().max(300),
    description: longText,
  })
  .strict();

const certificationSchema = z
  .object({
    id: entryId,
    name: shortText,
    issuer: shortText,
    date: z.string().max(30),
  })
  .strict();

export const resumeDocumentSchema = z
  .object({
    version: z.literal(1),
    title: z.string().min(1).max(120),
    language: resumeLanguageSchema,
    contact: z
      .object({
        fullName: shortText,
        headline: shortText,
        email: z.string().max(254),
        phone: z.string().max(60),
        location: shortText,
        website: z.string().max(300),
        linkedin: z.string().max(300),
      })
      .strict(),
    summary: longText,
    experience: z.array(experienceSchema).max(12),
    education: z.array(educationSchema).max(8),
    skills: z.array(z.string().max(100)).max(40),
    projects: z.array(projectSchema).max(10),
    certifications: z.array(certificationSchema).max(12),
  })
  .strict();

export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export type ResumeLanguage = z.infer<typeof resumeLanguageSchema>;
export type ResumeExperience = ResumeDocument["experience"][number];
export type ResumeEducation = ResumeDocument["education"][number];
export type ResumeProject = ResumeDocument["projects"][number];
export type ResumeCertification = ResumeDocument["certifications"][number];

export function createEmptyResumeDocument(): ResumeDocument {
  return {
    version: 1,
    title: "My Resume",
    language: "en",
    contact: {
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}
