import "server-only";

import { prisma } from "@/src/lib/prisma";
import {
  normalizeApplicationText,
  normalizeApplicationUrl,
} from "@/src/server/applications/normalize-application";
import type {
  DuplicateApplicationReason,
  DuplicateApplicationSummary,
} from "@/src/types/application";

type DuplicateCheckData = {
  company: string;
  role: string;
  location?: string;
  applicationUrl?: string;
};

type DuplicateApplication = {
  duplicateReason: DuplicateApplicationReason;
  duplicate: DuplicateApplicationSummary;
};

type FindDuplicateApplicationOptions = {
  excludeApplicationId?: string;
};

export async function findDuplicateApplication(
  userId: string,
  data: DuplicateCheckData,
  options: FindDuplicateApplicationOptions = {},
): Promise<DuplicateApplication | null> {
  const excludedId = options.excludeApplicationId;

  if (data.applicationUrl) {
    const normalizedSubmittedUrl = normalizeApplicationUrl(data.applicationUrl);
    const urlCandidates = await prisma.application.findMany({
      where: {
        userId,
        applicationUrl: { not: null },
        ...(excludedId ? { id: { not: excludedId } } : {}),
      },
      select: {
        id: true,
        slug: true,
        company: true,
        role: true,
        location: true,
        applicationUrl: true,
      },
    });
    const duplicateByUrl = urlCandidates.find(
      (candidate) =>
        normalizedSubmittedUrl !== null &&
        candidate.applicationUrl !== null &&
        normalizeApplicationUrl(candidate.applicationUrl) === normalizedSubmittedUrl,
    );

    if (duplicateByUrl) {
      return {
        duplicateReason: "url",
        duplicate: {
          id: duplicateByUrl.id,
          slug: duplicateByUrl.slug,
          company: duplicateByUrl.company,
          role: duplicateByUrl.role,
          location: duplicateByUrl.location,
        },
      };
    }
  }

  if (!data.location) return null;

  const normalizedCompany = normalizeApplicationText(data.company);
  const normalizedRole = normalizeApplicationText(data.role);
  const normalizedLocation = normalizeApplicationText(data.location);
  const fieldCandidates = await prisma.application.findMany({
    where: {
      userId,
      location: { not: null },
      ...(excludedId ? { id: { not: excludedId } } : {}),
    },
    select: {
      id: true,
      slug: true,
      company: true,
      role: true,
      location: true,
    },
  });
  const duplicateByFields = fieldCandidates.find(
    (candidate) =>
      candidate.location !== null &&
      normalizeApplicationText(candidate.company) === normalizedCompany &&
      normalizeApplicationText(candidate.role) === normalizedRole &&
      normalizeApplicationText(candidate.location) === normalizedLocation,
  );

  if (!duplicateByFields) return null;

  return {
    duplicateReason: "company-role-location",
    duplicate: {
      id: duplicateByFields.id,
      slug: duplicateByFields.slug,
      company: duplicateByFields.company,
      role: duplicateByFields.role,
      location: duplicateByFields.location,
    },
  };
}
