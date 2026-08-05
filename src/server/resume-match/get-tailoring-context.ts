import "server-only";

import { applyAcceptedResumeMatchSuggestions } from "../../lib/resume-match/apply-suggestions";
import { resumeMatchResultSchema } from "../../lib/resume-match/schema";
import { resumeDocumentSchema } from "../../lib/resume-builder/schema";
import { prisma } from "../../lib/prisma";
import { requireUser } from "../auth/require-user";
import type { ResumeTailoringContext } from "../../types/resume-match";

export async function getResumeTailoringContextForCurrentUser(
  matchId?: string | null,
  resumeId?: string | null,
): Promise<ResumeTailoringContext | null> {
  if (!matchId || !resumeId) return null;
  const userId = await requireUser();
  const match = await prisma.applicationResumeMatch.findFirst({
    where: {
      id: matchId,
      tailoredResumeDraftId: resumeId,
      application: { userId },
      tailoredResumeDraft: { userId },
    },
    include: { resumeVersion: true },
  });
  if (!match) return null;

  const source = resumeDocumentSchema.safeParse(match.resumeVersion.resumeContent);
  const result = resumeMatchResultSchema.safeParse(match.result);
  if (!source.success || !result.success) return null;
  const tailored = applyAcceptedResumeMatchSuggestions(
    source.data,
    result.data,
    match.acceptedSuggestionIndexes,
  );

  return {
    matchId: match.id,
    company: match.resumeVersion.company,
    role: match.resumeVersion.jobTitle,
    sourceResumeTitle: match.resumeVersion.resumeTitle,
    changes: tailored.changes,
  };
}
