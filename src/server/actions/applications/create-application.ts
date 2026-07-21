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
import { createApplicationSchema } from "@/src/server/validations/application";
import type {
  ApplicationFormData,
  CreateApplicationResult,
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createApplication(
  input: ApplicationFormData,
): Promise<CreateApplicationResult> {
  const userId = await requireUser();
  const parsed = createApplicationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Please correct the highlighted fields and try again.",
    };
  }

  const data = parsed.data;
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
        formError: "We couldn’t save this application. Please try again.",
      };
    }
  }

  return {
    success: false,
    formError: "We couldn’t create a unique application link. Please try again.",
  };
}
