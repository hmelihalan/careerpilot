"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import {
  createApplicationReminderSchema,
  deleteApplicationReminderSchema,
  setApplicationReminderCompletionSchema,
  type CreateApplicationReminderInput,
  type DeleteApplicationReminderInput,
  type SetApplicationReminderCompletionInput,
} from "@/src/server/validations/application";
import type { ApplicationMutationResult } from "@/src/types/application";

function refreshReminderViews(slug: string) {
  revalidatePath(`/applications/${slug}`);
  revalidatePath("/dashboard");
}

export async function createApplicationReminder(
  input: CreateApplicationReminderInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = createApplicationReminderSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Add a title and valid reminder time.",
    };
  }

  const { slug, title, remindAt } = parsed.data;

  try {
    const application = await prisma.application.findFirst({
      where: { userId, slug },
      select: { id: true },
    });

    if (!application) {
      return {
        success: false,
        reason: "not-found",
        formError: "We couldn’t find that application.",
      };
    }

    await prisma.applicationReminder.create({
      data: {
        applicationId: application.id,
        title,
        remindAt: new Date(remindAt),
      },
    });
    refreshReminderViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "We couldn’t save this reminder. Please try again.",
    };
  }
}

export async function setApplicationReminderCompletion(
  input: SetApplicationReminderCompletionInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = setApplicationReminderCompletionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "The reminder update was invalid.",
    };
  }

  const { slug, reminderId, completed } = parsed.data;

  try {
    const updated = await prisma.applicationReminder.updateMany({
      where: {
        id: reminderId,
        application: { userId, slug },
      },
      data: { completedAt: completed ? new Date() : null },
    });

    if (updated.count === 0) {
      return {
        success: false,
        reason: "not-found",
        formError: "We couldn’t find that reminder.",
      };
    }

    refreshReminderViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "We couldn’t update this reminder. Please try again.",
    };
  }
}

export async function deleteApplicationReminder(
  input: DeleteApplicationReminderInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = deleteApplicationReminderSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "The delete request was invalid.",
    };
  }

  const { slug, reminderId } = parsed.data;

  try {
    const deleted = await prisma.applicationReminder.deleteMany({
      where: {
        id: reminderId,
        application: { userId, slug },
      },
    });

    if (deleted.count === 0) {
      return {
        success: false,
        reason: "not-found",
        formError: "We couldn’t find that reminder.",
      };
    }

    refreshReminderViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "We couldn’t delete this reminder. Please try again.",
    };
  }
}
