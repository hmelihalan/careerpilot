import type { ApplicationStatus as PrismaApplicationStatusValue } from "@/src/generated/prisma/enums";
import type { InterviewQuestion } from "@/src/lib/application-materials/schema";
import type { ApplicationResumeMatchView } from "@/src/types/resume-match";

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

export type ApplicationDetailReminder = {
  id: string;
  title: string;
  remindAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationInterviewStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED";

export type ApplicationDetailInterview = {
  id: string;
  title: string;
  roundNumber: number;
  scheduledAt: string;
  durationMinutes: number;
  interviewerName: string | null;
  interviewerRole: string | null;
  location: string | null;
  meetingUrl: string | null;
  status: ApplicationInterviewStatus;
  completedAt: string | null;
  reminderMinutesBefore: number | null;
  reminderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationMaterialView = {
  id: string;
  resumeDraftId: string | null;
  resumeTitle: string;
  coverLetter: string;
  followUpMessage: string;
  interviewQuestions: readonly InterviewQuestion[];
  isSubmitted: boolean;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubmittedResumeVersionView = {
  id: string;
  sourceResumeDraftId: string | null;
  resumeTitle: string;
  submittedAt: string;
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
  statusValue: PrismaApplicationStatusValue;
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
  editValues: ApplicationEditFormData;
  notes: readonly ApplicationDetailNote[];
  reminders: readonly ApplicationDetailReminder[];
  interviews: readonly ApplicationDetailInterview[];
  materials: readonly ApplicationMaterialView[];
  submittedResume: SubmittedResumeVersionView | null;
  resumeMatches: readonly ApplicationResumeMatchView[];
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

export type ApplicationCoreFormData = {
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
};

export type ApplicationFormData = ApplicationCoreFormData & {
  status: ApplicationCreationStatus;
};

export type ApplicationEditFormData = ApplicationCoreFormData & {
  salaryMin: string;
  salaryMax: string;
  currency: string;
  appliedAt: string;
};

export type ApplicationFieldErrors = Partial<
  Record<keyof ApplicationFormData, string>
>;

export type ApplicationEditFieldErrors = Partial<
  Record<keyof ApplicationEditFormData, string>
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

export type UpdateApplicationStatusResult =
  | {
      success: true;
      status: PrismaApplicationStatusValue;
      changed: true;
    }
  | {
      success: true;
      status: PrismaApplicationStatusValue;
      changed: false;
    }
  | {
      success: false;
      reason: "validation" | "not-found" | "server";
      fieldErrors?: Record<string, string[]>;
      formError: string;
    };

export type UpdateApplicationResult =
  | {
      success: true;
      slug: string;
    }
  | {
      success: false;
      reason: "duplicate";
      duplicateReason: DuplicateApplicationReason;
      duplicate: DuplicateApplicationSummary;
      formError: string;
    }
  | {
      success: false;
      reason: "validation" | "not-found" | "server";
      fieldErrors?: Partial<
        Record<keyof ApplicationEditFormData | "slug", string[]>
      >;
      formError: string;
    };

export type DeleteApplicationResult =
  | {
      success: true;
    }
  | {
      success: false;
      reason: "validation" | "not-found" | "server";
      fieldErrors?: { slug?: string[] };
      formError: string;
    };

export type ApplicationMutationResult =
  | { success: true }
  | {
      success: false;
      reason: "validation" | "not-found" | "server";
      fieldErrors?: Record<string, string[]>;
      formError: string;
    };
