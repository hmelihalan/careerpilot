import "server-only";

import {
  findDuplicateByFields,
  findDuplicateByUrl,
} from "@/src/lib/applications/duplicate-application";
import { prisma } from "@/src/lib/prisma";
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
    const duplicateByUrl = findDuplicateByUrl(data, urlCandidates);

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

  if (!data.company.trim() || !data.role.trim() || !data.location?.trim()) {
    return null;
  }

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
  const duplicateByFields = findDuplicateByFields(data, fieldCandidates);

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
