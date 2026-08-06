import "server-only";

import type {
  Application as PrismaApplicationRecord,
  Prisma,
} from "../../generated/prisma/client";
import {
  ApplicationSource as PrismaApplicationSource,
  ApplicationStatus as PrismaApplicationStatus,
  EmploymentType as PrismaEmploymentType,
  WorkMode as PrismaWorkMode,
  type ApplicationSource,
  type ApplicationStatus,
  type EmploymentType,
  type WorkMode,
} from "../../generated/prisma/enums";
import { APPLICATION_STATUS_META } from "@/src/constants/application-status";
import { interviewQuestionsSchema } from "@/src/lib/application-materials/schema";
import { resumeMatchResultSchema } from "@/src/lib/resume-match/schema";
import type {
  ApplicationCreationStatus,
  ApplicationDetailViewModel,
  ApplicationListItem,
  ApplicationStatus as UiApplicationStatus,
  ApplicationWorkMode,
} from "@/src/types/application";

export const prismaStatusToUi = Object.fromEntries(
  Object.entries(APPLICATION_STATUS_META).map(([value, meta]) => [
    value,
    meta.label,
  ]),
) as Record<ApplicationStatus, UiApplicationStatus>;

export const uiInitialStatusToPrisma = {
  Wishlist: PrismaApplicationStatus.WISHLIST,
  Applied: PrismaApplicationStatus.APPLIED,
} as const satisfies Record<ApplicationCreationStatus, ApplicationStatus>;

export const prismaWorkModeToUi = {
  [PrismaWorkMode.REMOTE]: "Remote",
  [PrismaWorkMode.HYBRID]: "Hybrid",
  [PrismaWorkMode.ON_SITE]: "On-site",
} as const satisfies Record<WorkMode, ApplicationWorkMode>;

export const uiWorkModeToPrisma = {
  Remote: PrismaWorkMode.REMOTE,
  Hybrid: PrismaWorkMode.HYBRID,
  "On-site": PrismaWorkMode.ON_SITE,
} as const satisfies Record<ApplicationWorkMode, WorkMode>;

export const prismaEmploymentTypeToUi = {
  [PrismaEmploymentType.INTERNSHIP]: "Internship",
  [PrismaEmploymentType.FULL_TIME]: "Full-time",
  [PrismaEmploymentType.PART_TIME]: "Part-time",
  [PrismaEmploymentType.CONTRACT]: "Contract",
  [PrismaEmploymentType.TEMPORARY]: "Temporary",
  [PrismaEmploymentType.OTHER]: "Other",
} as const satisfies Record<EmploymentType, string>;

export const uiEmploymentTypeToPrisma = {
  Internship: PrismaEmploymentType.INTERNSHIP,
  "Full-time": PrismaEmploymentType.FULL_TIME,
  "Part-time": PrismaEmploymentType.PART_TIME,
  Contract: PrismaEmploymentType.CONTRACT,
  Temporary: PrismaEmploymentType.TEMPORARY,
  Other: PrismaEmploymentType.OTHER,
} as const satisfies Record<string, EmploymentType>;

export const prismaSourceToUi = {
  [PrismaApplicationSource.LINKEDIN]: "LinkedIn",
  [PrismaApplicationSource.COMPANY_WEBSITE]: "Company website",
  [PrismaApplicationSource.GREENHOUSE]: "Greenhouse",
  [PrismaApplicationSource.LEVER]: "Lever",
  [PrismaApplicationSource.ASHBY]: "Ashby",
  [PrismaApplicationSource.REFERRAL]: "Referral",
  [PrismaApplicationSource.OTHER]: "Other",
} as const satisfies Record<ApplicationSource, string>;

export const uiSourceToPrisma = {
  LinkedIn: PrismaApplicationSource.LINKEDIN,
  "Company website": PrismaApplicationSource.COMPANY_WEBSITE,
  Greenhouse: PrismaApplicationSource.GREENHOUSE,
  Lever: PrismaApplicationSource.LEVER,
  Ashby: PrismaApplicationSource.ASHBY,
  Referral: PrismaApplicationSource.REFERRAL,
  Other: PrismaApplicationSource.OTHER,
} as const satisfies Record<string, ApplicationSource>;

type PrismaApplicationDetailRecord = Prisma.ApplicationGetPayload<{
  include: {
    materials: true;
    resumeMatches: { include: { resumeVersion: true } };
    resumeVersions: true;
    notes: true;
    reminders: true;
    interviews: true;
    contacts: { include: { reminder: true } };
    statusHistory: true;
  };
}>;

function getInitials(company: string): string {
  const initials = company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return initials || "AP";
}

export function toApplicationListItem(
  application: PrismaApplicationRecord,
): ApplicationListItem {
  return {
    id: application.id,
    slug: application.slug,
    initials: getInitials(application.company),
    role: application.role,
    company: application.company,
    status: prismaStatusToUi[application.status],
    matchScore: application.matchScore,
    location: application.location || "Location not specified",
    workMode: application.workMode
      ? prismaWorkModeToUi[application.workMode]
      : null,
    updatedAt: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(application.updatedAt),
    skills: application.requiredSkills,
  };
}

function normalizeOptionalText(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function toDateInputValue(value: Date | null): string {
  return value?.toISOString().slice(0, 10) ?? "";
}

export function formatApplicationSalary(
  salaryMin: number | null,
  salaryMax: number | null,
  currency: string | null,
): string | null {
  if (salaryMin === null && salaryMax === null) return null;

  const normalizedCurrency = normalizeOptionalText(currency)?.toUpperCase();
  const numberFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  });
  const formatAmount = (amount: number): string => {
    if (!normalizedCurrency) return numberFormatter.format(amount);

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: normalizedCurrency,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${normalizedCurrency} ${numberFormatter.format(amount)}`;
    }
  };

  if (salaryMin !== null && salaryMax !== null) {
    return `${formatAmount(salaryMin)} – ${formatAmount(salaryMax)}`;
  }

  if (salaryMin !== null) {
    return `From ${formatAmount(salaryMin)}`;
  }

  return salaryMax === null ? null : `Up to ${formatAmount(salaryMax)}`;
}

export function toApplicationDetailViewModel(
  application: PrismaApplicationDetailRecord,
): ApplicationDetailViewModel {
  return {
    id: application.id,
    slug: application.slug,
    initials: getInitials(application.company),
    company: application.company,
    role: application.role,
    status: prismaStatusToUi[application.status],
    statusValue: application.status,
    location: normalizeOptionalText(application.location),
    workMode: application.workMode
      ? prismaWorkModeToUi[application.workMode]
      : null,
    employmentType: application.employmentType
      ? prismaEmploymentTypeToUi[application.employmentType]
      : null,
    source: application.source ? prismaSourceToUi[application.source] : null,
    applicationUrl: normalizeOptionalText(application.applicationUrl),
    jobDescription: normalizeOptionalText(application.description),
    salary: formatApplicationSalary(
      application.salaryMin,
      application.salaryMax,
      application.currency,
    ),
    skills: application.requiredSkills,
    dates: {
      appliedAt: application.appliedAt?.toISOString() ?? null,
      deadline: application.deadline?.toISOString() ?? null,
    },
    editValues: {
      company: application.company,
      role: application.role,
      location: application.location ?? "",
      workMode: application.workMode
        ? prismaWorkModeToUi[application.workMode]
        : "",
      employmentType: application.employmentType
        ? prismaEmploymentTypeToUi[application.employmentType]
        : "",
      source: application.source ? prismaSourceToUi[application.source] : "",
      applicationUrl: application.applicationUrl ?? "",
      deadline: toDateInputValue(application.deadline),
      requiredSkills: application.requiredSkills,
      description: application.description ?? "",
      salaryMin: application.salaryMin?.toString() ?? "",
      salaryMax: application.salaryMax?.toString() ?? "",
      currency: application.currency ?? "",
      appliedAt: toDateInputValue(application.appliedAt),
    },
    notes: application.notes.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
    reminders: application.reminders.map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      remindAt: reminder.remindAt.toISOString(),
      completedAt: reminder.completedAt?.toISOString() ?? null,
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
    })),
    interviews: application.interviews.map((interview) => ({
      id: interview.id,
      title: interview.title,
      roundNumber: interview.roundNumber,
      scheduledAt: interview.scheduledAt.toISOString(),
      durationMinutes: interview.durationMinutes,
      interviewerName: interview.interviewerName,
      interviewerRole: interview.interviewerRole,
      location: interview.location,
      meetingUrl: interview.meetingUrl,
      status: interview.status,
      completedAt: interview.completedAt?.toISOString() ?? null,
      reminderMinutesBefore: interview.reminderMinutesBefore,
      reminderId: interview.reminderId,
      createdAt: interview.createdAt.toISOString(),
      updatedAt: interview.updatedAt.toISOString(),
    })),
    contacts: application.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      contactType: contact.contactType,
      role: contact.role,
      email: contact.email,
      linkedinUrl: contact.linkedinUrl,
      lastContactedAt: contact.lastContactedAt?.toISOString() ?? null,
      nextFollowUpAt: contact.nextFollowUpAt?.toISOString() ?? null,
      reminderId: contact.reminderId,
      reminderCompletedAt: contact.reminder?.completedAt?.toISOString() ?? null,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    })),
    materials: application.materials.map((material) => {
      const interviewQuestions = interviewQuestionsSchema.safeParse(
        material.interviewQuestions,
      );
      return {
        id: material.id,
        resumeDraftId: material.resumeDraftId,
        resumeTitle: material.resumeTitle,
        coverLetter: material.coverLetter,
        followUpMessage: material.followUpMessage,
        interviewQuestions: interviewQuestions.success
          ? interviewQuestions.data
          : [],
        isSubmitted: material.isSubmitted,
        submittedAt: material.submittedAt?.toISOString() ?? null,
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      };
    }),
    submittedResume: application.resumeVersions[0]?.submittedAt
      ? {
          id: application.resumeVersions[0].id,
          sourceResumeDraftId:
            application.resumeVersions[0].sourceResumeDraftId,
          resumeTitle: application.resumeVersions[0].resumeTitle,
          submittedAt: application.resumeVersions[0].submittedAt.toISOString(),
        }
      : null,
    resumeMatches: application.resumeMatches.flatMap((match) => {
      const result = resumeMatchResultSchema.safeParse(match.result);
      if (!result.success) return [];
      return [
        {
          id: match.id,
          resumeVersionId: match.resumeVersionId,
          sourceResumeDraftId: match.resumeVersion.sourceResumeDraftId,
          resumeTitle: match.resumeVersion.resumeTitle,
          isSubmitted: match.resumeVersion.isSubmitted,
          submittedAt: match.resumeVersion.submittedAt?.toISOString() ?? null,
          result: result.data,
          acceptedSuggestionIndexes: match.acceptedSuggestionIndexes,
          rejectedSuggestionIndexes: match.rejectedSuggestionIndexes,
          tailoredResumeDraftId: match.tailoredResumeDraftId,
          provider: match.provider,
          model: match.model,
          createdAt: match.createdAt.toISOString(),
        },
      ];
    }),
    statusHistory: application.statusHistory.map((history) => ({
      id: history.id,
      fromStatus: history.fromStatus
        ? prismaStatusToUi[history.fromStatus]
        : null,
      toStatus: prismaStatusToUi[history.toStatus],
      changedAt: history.changedAt.toISOString(),
    })),
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}
