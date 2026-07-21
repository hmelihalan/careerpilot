import "server-only";

import type { Application as PrismaApplicationRecord } from "../../generated/prisma/client";
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
import type {
  ApplicationCreationStatus,
  ApplicationListItem,
  ApplicationStatus as UiApplicationStatus,
  ApplicationWorkMode,
} from "@/src/types/application";

export const prismaStatusToUi = {
  [PrismaApplicationStatus.WISHLIST]: "Wishlist",
  [PrismaApplicationStatus.APPLIED]: "Applied",
  [PrismaApplicationStatus.ASSESSMENT]: "Assessment",
  [PrismaApplicationStatus.INTERVIEW]: "Interview",
  [PrismaApplicationStatus.OFFER]: "Offer",
  [PrismaApplicationStatus.REJECTED]: "Rejected",
} as const satisfies Record<ApplicationStatus, UiApplicationStatus>;

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
