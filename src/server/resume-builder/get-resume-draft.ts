import "server-only";

import { prisma } from "@/src/lib/prisma";
import {
  createEmptyResumeDocument,
  resumeDocumentSchema,
  type ResumeDocument,
} from "@/src/lib/resume-builder/schema";
import { requireUser } from "@/src/server/auth/require-user";

export type CurrentResumeDraft = {
  id: string | null;
  draft: ResumeDocument;
};

export async function getResumeDraftForCurrentUser(
  resumeId?: string | null,
): Promise<CurrentResumeDraft | null> {
  const userId = await requireUser();
  const draft = await prisma.resumeDraft.findFirst({
    where: resumeId ? { id: resumeId, userId } : { userId },
    orderBy: resumeId ? undefined : { updatedAt: "desc" },
  });

  if (!draft) {
    return resumeId
      ? null
      : { id: null, draft: createEmptyResumeDocument() };
  }

  const parsed = resumeDocumentSchema.safeParse(draft.content);
  return {
    id: draft.id,
    draft: parsed.success ? parsed.data : createEmptyResumeDocument(),
  };
}
