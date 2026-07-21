export type ApplicationImportMethod = "description" | "url";

export type ApplicationCreationStatus = "Wishlist" | "Applied";

export type ApplicationStatus =
  | ApplicationCreationStatus
  | "Assessment"
  | "Interview"
  | "Offer"
  | "Rejected";

export type ApplicationWorkMode = "Remote" | "Hybrid" | "On-site";

export type ApplicationListItem = {
  id: string;
  slug: string;
  initials: string;
  role: string;
  company: string;
  status: ApplicationStatus;
  matchScore: number | null;
  location: string;
  workMode: ApplicationWorkMode | null;
  updatedAt: string;
  skills: readonly string[];
};

export type ApplicationDetailNote = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationDetailStatusHistory = {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: string;
};

export type ApplicationDetailViewModel = {
  id: string;
  slug: string;
  initials: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  location: string | null;
  workMode: ApplicationWorkMode | null;
  employmentType: string | null;
  source: string | null;
  applicationUrl: string | null;
  jobDescription: string | null;
  salary: string | null;
  skills: readonly string[];
  dates: {
    appliedAt: string | null;
    deadline: string | null;
  };
  notes: readonly ApplicationDetailNote[];
  statusHistory: readonly ApplicationDetailStatusHistory[];
  createdAt: string;
  updatedAt: string;
};

export type MockApplication = Omit<
  ApplicationListItem,
  "matchScore" | "workMode"
> & {
  matchScore: number;
  workMode: ApplicationWorkMode;
  employmentType: string;
  appliedDate: string;
  appliedAgo: string;
  source: string;
  deadline: string;
  applicationUrl: string;
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
  Record<keyof ApplicationFormData, string>
>;

export type CreateApplicationFieldErrors = Partial<
  Record<keyof ApplicationFormData, string[]>
>;

export type DuplicateApplicationReason =
  | "url"
  | "company-role-location";

export type DuplicateApplicationSummary = {
  id: string;
  slug: string;
  company: string;
  role: string;
  location: string | null;
};

export type CreateApplicationResult =
  | {
      success: true;
      applicationId: string;
      slug: string;
    }
  | {
      success: false;
      reason: "duplicate";
      duplicateReason: DuplicateApplicationReason;
      duplicate: DuplicateApplicationSummary;
    }
  | {
      success: false;
      reason: "error";
      fieldErrors?: CreateApplicationFieldErrors;
      formError: string;
    };

export type AddApplicationStep =
  | "import"
  | "loading"
  | "review"
  | "error"
  | "duplicate"
  | "saving"
  | "success";
