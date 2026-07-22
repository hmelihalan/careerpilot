import "server-only";

import { prisma } from "@/src/lib/prisma";
import { requireUser } from "@/src/server/auth/require-user";
import { toResumeListItem } from "./resume-mappings";
import type { ResumeListItemViewModel } from "@/src/types/resume";

export async function getResumesForCurrentUser(): Promise<
  ResumeListItemViewModel[]
> {
  const userId = await requireUser();

  try {
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return resumes.map(toResumeListItem);
  } catch {
    throw new Error("Unable to load resumes.");
  }
}
