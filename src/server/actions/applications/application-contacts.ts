"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import {
  createApplicationContactSchema,
  deleteApplicationContactSchema,
  logApplicationContactSchema,
  updateApplicationContactSchema,
  type CreateApplicationContactInput,
  type DeleteApplicationContactInput,
  type LogApplicationContactInput,
  type UpdateApplicationContactInput,
} from "@/src/server/validations/application";
import type { ApplicationMutationResult } from "@/src/types/application";

function refreshContactViews(slug: string) {
  revalidatePath(`/applications/${slug}`);
  revalidatePath("/dashboard");
}

function followUpTitle(name: string): string {
  return `Follow up with ${name}`.slice(0, 200);
}

export async function createApplicationContact(
  input: CreateApplicationContactInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = createApplicationContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Check the contact details and try again.",
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

    await prisma.$transaction(async (transaction) => {
      const reminder = data.nextFollowUpAt
        ? await transaction.applicationReminder.create({
            data: {
              applicationId: application.id,
              title: followUpTitle(data.name),
              remindAt: new Date(data.nextFollowUpAt),
            },
            select: { id: true },
          })
        : null;

      await transaction.applicationContact.create({
        data: {
          applicationId: application.id,
          name: data.name,
          contactType: data.contactType,
          role: data.role ?? null,
          email: data.email ?? null,
          linkedinUrl: data.linkedinUrl ?? null,
          lastContactedAt: data.lastContactedAt
            ? new Date(data.lastContactedAt)
            : null,
          nextFollowUpAt: data.nextFollowUpAt
            ? new Date(data.nextFollowUpAt)
            : null,
          reminderId: reminder?.id,
        },
      });
    });
    refreshContactViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "The contact could not be saved. Please try again.",
    };
  }
}

export async function updateApplicationContact(
  input: UpdateApplicationContactInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = updateApplicationContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Check the contact details and try again.",
    };
  }

  const { slug, contactId, ...data } = parsed.data;
  try {
    const contact = await prisma.applicationContact.findFirst({
      where: { id: contactId, application: { userId, slug } },
      select: { applicationId: true, reminderId: true },
    });
    if (!contact) {
      return { success: false, reason: "not-found", formError: "Contact not found." };
    }

    await prisma.$transaction(async (transaction) => {
      let reminderId = contact.reminderId;
      if (!data.nextFollowUpAt) {
        if (reminderId) {
          await transaction.applicationReminder.delete({ where: { id: reminderId } });
          reminderId = null;
        }
      } else {
        const reminderData = {
          title: followUpTitle(data.name),
          remindAt: new Date(data.nextFollowUpAt),
          completedAt: null,
        };
        if (reminderId) {
          await transaction.applicationReminder.update({
            where: { id: reminderId },
            data: reminderData,
          });
        } else {
          const reminder = await transaction.applicationReminder.create({
            data: { applicationId: contact.applicationId, ...reminderData },
            select: { id: true },
          });
          reminderId = reminder.id;
        }
      }

      await transaction.applicationContact.update({
        where: { id: contactId },
        data: {
          name: data.name,
          contactType: data.contactType,
          role: data.role ?? null,
          email: data.email ?? null,
          linkedinUrl: data.linkedinUrl ?? null,
          lastContactedAt: data.lastContactedAt
            ? new Date(data.lastContactedAt)
            : null,
          nextFollowUpAt: data.nextFollowUpAt
            ? new Date(data.nextFollowUpAt)
            : null,
          reminderId,
        },
      });
    });
    refreshContactViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "The contact could not be updated. Please try again.",
    };
  }
}

export async function logApplicationContact(
  input: LogApplicationContactInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = logApplicationContactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, reason: "validation", formError: "Invalid contact update." };
  }

  const { slug, contactId } = parsed.data;
  try {
    const updated = await prisma.applicationContact.updateMany({
      where: { id: contactId, application: { userId, slug } },
      data: { lastContactedAt: new Date() },
    });
    if (updated.count === 0) {
      return { success: false, reason: "not-found", formError: "Contact not found." };
    }
    refreshContactViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "The communication could not be logged. Please try again.",
    };
  }
}

export async function deleteApplicationContact(
  input: DeleteApplicationContactInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = deleteApplicationContactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, reason: "validation", formError: "Invalid delete request." };
  }

  const { slug, contactId } = parsed.data;
  try {
    const contact = await prisma.applicationContact.findFirst({
      where: { id: contactId, application: { userId, slug } },
      select: { reminderId: true },
    });
    if (!contact) {
      return { success: false, reason: "not-found", formError: "Contact not found." };
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.applicationContact.delete({ where: { id: contactId } });
      if (contact.reminderId) {
        await transaction.applicationReminder.deleteMany({
          where: {
            id: contact.reminderId,
            application: { userId, slug },
          },
        });
      }
    });
    refreshContactViews(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "The contact could not be deleted. Please try again.",
    };
  }
}
