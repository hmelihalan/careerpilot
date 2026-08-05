"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import {
  createApplicationInterviewSchema,
  deleteApplicationInterviewSchema,
  setApplicationInterviewStatusSchema,
  updateApplicationInterviewSchema,
  type CreateApplicationInterviewInput,
  type DeleteApplicationInterviewInput,
  type SetApplicationInterviewStatusInput,
  type UpdateApplicationInterviewInput,
} from "@/src/server/validations/application";
import type { ApplicationMutationResult } from "@/src/types/application";

function refreshInterviewViews(slug: string) {
  revalidatePath(`/applications/${slug}`);
  revalidatePath("/dashboard");
}

function reminderDate(scheduledAt: Date, minutesBefore: number): Date {
  return new Date(scheduledAt.getTime() - minutesBefore * 60_000);
}

function reminderTitle(title: string): string {
  return `Interview reminder: ${title}`.slice(0, 200);
}

export async function createApplicationInterview(
  input: CreateApplicationInterviewInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = createApplicationInterviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Check the interview details and try again.",
    };
  }

  const { slug, ...data } = parsed.data;
  try {
    const application = await prisma.application.findFirst({
      where: { userId, slug },
      select: { id: true },
    });
    if (!application) {
      return { success: false, reason: "not-found", formError: "Application not found." };
    }

    const scheduledAt = new Date(data.scheduledAt);
    await prisma.$transaction(async (transaction) => {
      const reminder =
        data.reminderMinutesBefore === null
          ? null
          : await transaction.applicationReminder.create({
              data: {
                applicationId: application.id,
                title: reminderTitle(data.title),
                remindAt: reminderDate(scheduledAt, data.reminderMinutesBefore),
              },
              select: { id: true },
            });

      await transaction.applicationInterview.create({
        data: {
          applicationId: application.id,
          title: data.title,
          roundNumber: data.roundNumber,
          scheduledAt,
          durationMinutes: data.durationMinutes,
          interviewerName: data.interviewerName,
          interviewerRole: data.interviewerRole,
          location: data.location,
          meetingUrl: data.meetingUrl,
          reminderMinutesBefore: data.reminderMinutesBefore,
          reminderId: reminder?.id,
        },
      });
    });
    refreshInterviewViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "The interview could not be scheduled. Please try again.",
    };
  }
}

export async function updateApplicationInterview(
  input: UpdateApplicationInterviewInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = updateApplicationInterviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Check the interview details and try again.",
    };
  }

  const { slug, interviewId, ...data } = parsed.data;
  try {
    const interview = await prisma.applicationInterview.findFirst({
      where: { id: interviewId, application: { userId, slug } },
      select: { applicationId: true, reminderId: true },
    });
    if (!interview) {
      return { success: false, reason: "not-found", formError: "Interview not found." };
    }

    const scheduledAt = new Date(data.scheduledAt);
    await prisma.$transaction(async (transaction) => {
      let reminderId = interview.reminderId;
      if (data.reminderMinutesBefore === null) {
        if (reminderId) {
          await transaction.applicationReminder.delete({ where: { id: reminderId } });
          reminderId = null;
        }
      } else {
        const reminderData = {
          title: reminderTitle(data.title),
          remindAt: reminderDate(scheduledAt, data.reminderMinutesBefore),
          completedAt: null,
        };
        if (reminderId) {
          await transaction.applicationReminder.update({
            where: { id: reminderId },
            data: reminderData,
          });
        } else {
          const reminder = await transaction.applicationReminder.create({
            data: { applicationId: interview.applicationId, ...reminderData },
            select: { id: true },
          });
          reminderId = reminder.id;
        }
      }

      await transaction.applicationInterview.update({
        where: { id: interviewId },
        data: {
          title: data.title,
          roundNumber: data.roundNumber,
          scheduledAt,
          durationMinutes: data.durationMinutes,
          interviewerName: data.interviewerName,
          interviewerRole: data.interviewerRole,
          location: data.location,
          meetingUrl: data.meetingUrl,
          reminderMinutesBefore: data.reminderMinutesBefore,
          reminderId,
        },
      });
    });
    refreshInterviewViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "The interview could not be updated. Please try again.",
    };
  }
}

export async function setApplicationInterviewStatus(
  input: SetApplicationInterviewStatusInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = setApplicationInterviewStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, reason: "validation", formError: "Invalid interview status." };
  }
  const { slug, interviewId, status } = parsed.data;

  try {
    const interview = await prisma.applicationInterview.findFirst({
      where: { id: interviewId, application: { userId, slug } },
      select: { reminderId: true },
    });
    if (!interview) {
      return { success: false, reason: "not-found", formError: "Interview not found." };
    }
    await prisma.$transaction(async (transaction) => {
      await transaction.applicationInterview.update({
        where: { id: interviewId },
        data: {
          status,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });
      if (interview.reminderId) {
        await transaction.applicationReminder.update({
          where: { id: interview.reminderId },
          data: { completedAt: status === "SCHEDULED" ? null : new Date() },
        });
      }
    });
    refreshInterviewViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "The interview status could not be updated.",
    };
  }
}

export async function deleteApplicationInterview(
  input: DeleteApplicationInterviewInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = deleteApplicationInterviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, reason: "validation", formError: "Invalid delete request." };
  }
  const { slug, interviewId } = parsed.data;

  try {
    const interview = await prisma.applicationInterview.findFirst({
      where: { id: interviewId, application: { userId, slug } },
      select: { reminderId: true },
    });
    if (!interview) {
      return { success: false, reason: "not-found", formError: "Interview not found." };
    }
    await prisma.$transaction(async (transaction) => {
      await transaction.applicationInterview.delete({ where: { id: interviewId } });
      if (interview.reminderId) {
        await transaction.applicationReminder.deleteMany({
          where: { id: interview.reminderId, application: { userId, slug } },
        });
      }
    });
    refreshInterviewViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "The interview could not be deleted. Please try again.",
    };
  }
}
