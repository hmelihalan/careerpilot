"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import {
  createApplicationNoteSchema,
  deleteApplicationNoteSchema,
  updateApplicationNoteSchema,
  type CreateApplicationNoteInput,
  type DeleteApplicationNoteInput,
  type UpdateApplicationNoteInput,
} from "@/src/server/validations/application";
import type { ApplicationMutationResult } from "@/src/types/application";

function refreshApplication(slug: string) {
  revalidatePath(`/applications/${slug}`);
  revalidatePath("/dashboard");
}

export async function createApplicationNote(
  input: CreateApplicationNoteInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = createApplicationNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Enter a note before saving.",
    };
  }

  const { slug, content } = parsed.data;

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

    await prisma.applicationNote.create({
      data: { applicationId: application.id, content },
    });
    refreshApplication(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "We couldn’t save this note. Please try again.",
    };
  }
}

export async function updateApplicationNote(
  input: UpdateApplicationNoteInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = updateApplicationNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "Enter a valid note before saving.",
    };
  }

  const { slug, noteId, content } = parsed.data;

  try {
    const updated = await prisma.applicationNote.updateMany({
      where: {
        id: noteId,
        application: { userId, slug },
      },
      data: { content },
    });

    if (updated.count === 0) {
      return {
        success: false,
        reason: "not-found",
        formError: "We couldn’t find that note.",
      };
    }

    refreshApplication(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "We couldn’t update this note. Please try again.",
    };
  }
}

export async function deleteApplicationNote(
  input: DeleteApplicationNoteInput,
): Promise<ApplicationMutationResult> {
  const userId = await requireUser();
  const parsed = deleteApplicationNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "The delete request was invalid.",
    };
  }

  const { slug, noteId } = parsed.data;

  try {
    const deleted = await prisma.applicationNote.deleteMany({
      where: {
        id: noteId,
        application: { userId, slug },
      },
    });

    if (deleted.count === 0) {
      return {
        success: false,
        reason: "not-found",
        formError: "We couldn’t find that note.",
      };
    }

    refreshApplication(slug);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "We couldn’t delete this note. Please try again.",
    };
  }
}
