"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import {
  deleteApplicationSchema,
  type DeleteApplicationInput,
} from "@/src/server/validations/application";
import type { DeleteApplicationResult } from "@/src/types/application";

export async function deleteApplication(
  input: DeleteApplicationInput,
): Promise<DeleteApplicationResult> {
  const userId = await requireUser();
  const parsed = deleteApplicationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      reason: "validation",
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "The delete request was invalid. Please try again.",
    };
  }

  const { slug } = parsed.data;

  try {
    const deleted = await prisma.application.deleteMany({
      where: {
        userId,
        slug,
      },
    });

    if (deleted.count === 0) {
      return {
        success: false,
        reason: "not-found",
        formError: "We couldn’t find that application.",
      };
    }

    revalidatePath("/applications");
    revalidatePath(`/applications/${slug}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch {
    return {
      success: false,
      reason: "server",
      formError: "We couldn’t delete this application. Please try again.",
    };
  }
}
