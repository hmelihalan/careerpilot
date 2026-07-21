"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import {
  uiEmploymentTypeToPrisma,
  uiInitialStatusToPrisma,
  uiSourceToPrisma,
  uiWorkModeToPrisma,
} from "@/src/server/applications/application-mappings";
import {
  normalizeApplicationText,
  normalizeApplicationUrl,
} from "@/src/server/applications/normalize-application";
import {
  createApplicationOptionsSchema,
  createApplicationSchema,
  type CreateApplicationInput,
  type CreateApplicationOptions,
} from "@/src/server/validations/application";
import type {
  ApplicationFormData,
  CreateApplicationResult,
  DuplicateApplicationReason,
  DuplicateApplicationSummary,
} from "@/src/types/application";

function createBaseSlug(company: string, role: string): string {
  const slug = `${company}-${role}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");

  return slug || "application";
}

type DuplicateApplication = {
  duplicateReason: DuplicateApplicationReason;
  duplicate: DuplicateApplicationSummary;
};

async function findDuplicateApplication(
  userId: string,
  data: CreateApplicationInput,
): Promise<DuplicateApplication | null> {
  if (data.applicationUrl) {
    const normalizedSubmittedUrl = normalizeApplicationUrl(data.applicationUrl);
    const urlCandidates = await prisma.application.findMany({
      where: {
        userId,
        applicationUrl: { not: null },
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createApplication(
  input: ApplicationFormData,
  options: CreateApplicationOptions = {},
): Promise<CreateApplicationResult> {
  const userId = await requireUser();
  const parsed = createApplicationSchema.safeParse(input);
  const parsedOptions = createApplicationOptionsSchema.safeParse(options);

  if (!parsed.success) {
    return {
      success: false,
      reason: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Please correct the highlighted fields and try again.",
    };
  }

  if (!parsedOptions.success) {
    return {
      success: false,
      reason: "error",
      formError: "The create request was invalid. Please try again.",
    };
  }

  const data = parsed.data;

  if (!parsedOptions.data.forceCreate) {
    const duplicate = await findDuplicateApplication(userId, data);

    if (duplicate) {
      return {
        success: false,
        reason: "duplicate",
        ...duplicate,
      };
    }
  }
  const status = uiInitialStatusToPrisma[data.status];
  const baseSlug = createBaseSlug(data.company, data.role);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug =
      attempt === 0 ? baseSlug : `${baseSlug}-${randomUUID().slice(0, 8)}`;

    try {
      const application = await prisma.$transaction(async (transaction) => {
        const existingApplication = await transaction.application.findUnique({
          where: {
            userId_slug: { userId, slug },
          },
          select: { id: true },
        });

        if (existingApplication) return null;

        return transaction.application.create({
          data: {
            userId,
            slug,
            company: data.company,
            role: data.role,
            description: data.description ?? null,
            status,
            location: data.location ?? null,
            workMode: data.workMode
              ? uiWorkModeToPrisma[data.workMode]
              : null,
            employmentType: data.employmentType
              ? uiEmploymentTypeToPrisma[data.employmentType]
              : null,
            source: data.source ? uiSourceToPrisma[data.source] : null,
            applicationUrl: data.applicationUrl ?? null,
            deadline: data.deadline
              ? new Date(`${data.deadline}T00:00:00.000Z`)
              : null,
            appliedAt: status === "APPLIED" ? new Date() : null,
            requiredSkills: data.requiredSkills,
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: status,
              },
            },
          },
          select: {
            id: true,
            slug: true,
          },
        });
      });

      if (!application) continue;

      revalidatePath("/applications");
      revalidatePath("/dashboard");

      return {
        success: true,
        applicationId: application.id,
        slug: application.slug,
      };
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) continue;

      return {
        success: false,
        reason: "error",
        formError: "We couldn’t save this application. Please try again.",
      };
    }
  }

  return {
    success: false,
    reason: "error",
    formError: "We couldn’t create a unique application link. Please try again.",
  };
}
