import type { ApplicationFormData } from "@/src/types/application";

export const EMPTY_APPLICATION: ApplicationFormData = {
  company: "",
  role: "",
  location: "",
  workMode: "",
  employmentType: "",
  source: "",
  applicationUrl: "",
  deadline: "",
  requiredSkills: [],
  description: "",
  status: "Wishlist",
};

export const MOCK_EXTRACTED_APPLICATION: ApplicationFormData = {
  company: "Kron",
  role: "Full Stack Intern",
  location: "Istanbul, Türkiye",
  workMode: "Hybrid",
  employmentType: "Internship",
  source: "LinkedIn",
  applicationUrl: "https://example.com/jobs/kron-full-stack-intern",
  deadline: "2026-07-28",
  requiredSkills: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "REST APIs",
    "Git",
    "Docker",
  ],
  description:
    "Join Kron as a Full Stack Intern and help build reliable web products with TypeScript, React, Next.js, and Node.js. You will collaborate with product and engineering teams, contribute to APIs and PostgreSQL-backed services, and learn modern testing, Git, and Docker workflows.",
  status: "Wishlist",
};

export const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "On-site"] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  "Internship",
  "Full-time",
  "Part-time",
  "Contract",
] as const;

export const MOCK_IMPORT_ERROR_TOKEN = "careerpilot:mock-error";
