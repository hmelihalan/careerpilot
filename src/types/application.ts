export type ApplicationImportMethod = "description" | "url";

export type ApplicationCreationStatus = "Wishlist" | "Applied";

export type ApplicationStatus =
  | ApplicationCreationStatus
  | "Assessment"
  | "Interview"
  | "Offer"
  | "Rejected";

export type ApplicationWorkMode = "Remote" | "Hybrid" | "On-site";

export type MockApplication = {
  id: string;
  slug: string;
  initials: string;
  role: string;
  company: string;
  status: ApplicationStatus;
  matchScore: number;
  location: string;
  workMode: ApplicationWorkMode;
  employmentType: string;
  appliedDate: string;
  appliedAgo: string;
  updatedAt: string;
  source: string;
  deadline: string;
  applicationUrl: string;
  skills: readonly string[];
  description: string;
};

export type ApplicationFormData = {
  company: string;
  role: string;
  location: string;
  workMode: string;
  employmentType: string;
  source: string;
  applicationUrl: string;
  deadline: string;
  requiredSkills: string[];
  description: string;
  status: ApplicationCreationStatus;
};

export type ApplicationFieldErrors = Partial<
  Record<"company" | "role" | "applicationUrl", string>
>;

export type AddApplicationStep =
  | "import"
  | "loading"
  | "review"
  | "error"
  | "saving"
  | "success";
