import "server-only";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import { toResumeListItem } from "./resume-mappings";
import type { ResumeListItemViewModel } from "@/src/types/resume";

export async function getResumeForCurrentUser(
  resumeId: string,
): Promise<ResumeListItemViewModel | null> {
  const userId = await requireUser();

  try {
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId,
      },
    });

    return resume ? toResumeListItem(resume) : null;
  } catch {
    throw new Error("Unable to load the resume.");
  }
}
