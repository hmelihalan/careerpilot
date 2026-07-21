"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import { updateApplicationStatusSchema } from "@/src/server/validations/application";
import type { UpdateApplicationStatusInput } from "@/src/server/validations/application";
import type { UpdateApplicationStatusResult } from "@/src/types/application";
import type { PrismaApplicationStatusValue } from "@/src/constants/application-status";

type TransactionOutcome =
  | { outcome: "not-found" }
  | { outcome: "no-change"; status: PrismaApplicationStatusValue }
  | { outcome: "changed"; status: PrismaApplicationStatusValue };

export async function updateApplicationStatus(
  input: UpdateApplicationStatusInput,
): Promise<UpdateApplicationStatusResult> {
  const userId = await requireUser();
  const parsed = updateApplicationStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Select a valid status and try again.",
    };
  }

  const { slug, status: targetStatus } = parsed.data;

  try {
    const result: TransactionOutcome = await prisma.$transaction(
      async (transaction) => {
        // Ownership check: only an application owned by the current user,
        // identified by its slug, can ever be read or mutated here.
        const application = await transaction.application.findFirst({
          where: {
            userId,
            slug,
          },
          select: { id: true, status: true },
        });

        if (!application) {
          return { outcome: "not-found" };
        }

        if (application.status === targetStatus) {
          return { outcome: "no-change", status: application.status };
        }

        await transaction.application.update({
          where: { id: application.id },
          data: { status: targetStatus },
        });

        await transaction.applicationStatusHistory.create({
          data: {
            applicationId: application.id,
            fromStatus: application.status,
            toStatus: targetStatus,
          },
        });

        return { outcome: "changed", status: targetStatus };
      },
    );

    if (result.outcome === "not-found") {
      return {
        success: false,
        reason: "not-found",
        formError: "We couldn’t find that application.",
      };
    }

    if (result.outcome === "no-change") {
      return {
        success: true,
        status: result.status,
        changed: false,
      };
    }

    revalidatePath("/applications");
    revalidatePath(`/applications/${slug}`);

    return {
      success: true,
      status: result.status,
      changed: true,
    };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "We couldn’t update the status. Please try again.",
    };
  }
}
