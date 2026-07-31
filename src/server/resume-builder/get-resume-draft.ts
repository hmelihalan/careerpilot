import "server-only";

import { prisma } from "@/src/lib/prisma";
import {
  createEmptyResumeDocument,
  resumeDocumentSchema,
  type ResumeDocument,
} from "@/src/lib/resume-builder/schema";
import { requireUser } from "@/src/server/auth/require-user";

export async function getResumeDraftForCurrentUser(): Promise<ResumeDocument> {
  const userId = await requireUser();
  const draft = await prisma.resumeDraft.findUnique({ where: { userId } });

  if (!draft) {
    return createEmptyResumeDocument();
  }

  const parsed = resumeDocumentSchema.safeParse(draft.content);
  return parsed.success ? parsed.data : createEmptyResumeDocument();
}
