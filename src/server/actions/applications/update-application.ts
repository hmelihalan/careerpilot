"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import {
  uiEmploymentTypeToPrisma,
  uiSourceToPrisma,
  uiWorkModeToPrisma,
} from "@/src/server/applications/application-mappings";
import { findDuplicateApplication } from "@/src/server/applications/find-duplicate-application";
import { updateApplicationSchema } from "@/src/server/validations/application";
import type {
  ApplicationEditFormData,
  UpdateApplicationResult,
} from "@/src/types/application";

export async function updateApplication(
  input: ApplicationEditFormData & { slug: string },
): Promise<UpdateApplicationResult> {
  const userId = await requireUser();
  const parsed = updateApplicationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Please correct the highlighted fields and try again.",
    };
  }

  const data = parsed.data;

  try {
    const application = await prisma.application.findFirst({
      where: {
        userId,
        slug: data.slug,
      },
      select: { id: true, slug: true },
    });

    if (!application) {
      return {
        success: false,
        reason: "not-found",
        formError: "We couldn’t find that application.",
      };
    }

    const duplicate = await findDuplicateApplication(userId, data, {
      excludeApplicationId: application.id,
    });

    if (duplicate) {
      return {
        success: false,
        reason: "duplicate",
        ...duplicate,
        formError:
          duplicate.duplicateReason === "url"
            ? "Another application already uses this job URL."
            : "Another application has the same company, role, and location.",
      };
    }

    await prisma.application.update({
      where: { id: application.id },
      data: {
        company: data.company,
        role: data.role,
        description: data.description ?? null,
        location: data.location ?? null,
        workMode: data.workMode ? uiWorkModeToPrisma[data.workMode] : null,
        employmentType: data.employmentType
          ? uiEmploymentTypeToPrisma[data.employmentType]
          : null,
        source: data.source ? uiSourceToPrisma[data.source] : null,
        applicationUrl: data.applicationUrl ?? null,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        currency: data.currency?.toUpperCase() ?? null,
        deadline: data.deadline
          ? new Date(`${data.deadline}T00:00:00.000Z`)
          : null,
        appliedAt: data.appliedAt
          ? new Date(`${data.appliedAt}T00:00:00.000Z`)
          : null,
        requiredSkills: data.requiredSkills,
      },
    });

    revalidatePath("/applications");
    revalidatePath(`/applications/${application.slug}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      slug: application.slug,
    };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "We couldn’t update this application. Please try again.",
    };
  }
}
