import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { resumeMatchResultSchema } from "@/src/lib/resume-match/schema";
import { resumeDocumentSchema } from "@/src/lib/resume-builder/schema";

const requestSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.enum(["accept", "reject", "reset"]),
      suggestionIndex: z.number().int().min(0).max(20),
    })
    .strict(),
  z
    .object({
      action: z.literal("mark_submitted"),
      useTailoredResume: z.boolean(),
    })
    .strict(),
]);

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ applicationId: string; matchId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to update a resume match.", "unauthorized", 401);
  }
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return errorResponse("The resume match update is invalid.", "invalid_request", 400);
  }

  const { applicationId: slug, matchId } = await params;
  const match = await prisma.applicationResumeMatch.findFirst({
    where: { id: matchId, application: { userId, slug } },
    include: { resumeVersion: true, tailoredResumeDraft: true },
  });
  if (!match) return errorResponse("Resume match not found.", "not_found", 404);

  const result = resumeMatchResultSchema.safeParse(match.result);
  if (!result.success) {
    return errorResponse("The saved resume match is invalid.", "invalid_match", 409);
  }

  if (input.data.action !== "mark_submitted") {
    const index = input.data.suggestionIndex;
    if (!result.data.suggestions[index]) {
      return errorResponse("Suggestion not found.", "suggestion_not_found", 404);
    }
    const accepted = new Set(match.acceptedSuggestionIndexes);
    const rejected = new Set(match.rejectedSuggestionIndexes);
    if (input.data.action === "accept") {
      accepted.add(index);
      rejected.delete(index);
    } else if (input.data.action === "reject") {
      rejected.add(index);
      accepted.delete(index);
    } else {
      accepted.delete(index);
      rejected.delete(index);
    }

    await prisma.applicationResumeMatch.update({
      where: { id: match.id },
      data: {
        acceptedSuggestionIndexes: [...accepted].sort((a, b) => a - b),
        rejectedSuggestionIndexes: [...rejected].sort((a, b) => a - b),
      },
    });
    return NextResponse.json({ success: true });
  }

  const useTailoredResume = input.data.useTailoredResume;
  let submittedVersionId = match.resumeVersionId;
  await prisma.$transaction(async (transaction) => {
    await transaction.applicationResumeVersion.updateMany({
      where: { applicationId: match.applicationId, isSubmitted: true },
      data: { isSubmitted: false, submittedAt: null },
    });

    if (useTailoredResume) {
      const tailored = match.tailoredResumeDraft;
      if (!tailored) {
        throw new Error("TAILORED_RESUME_NOT_FOUND");
      }
      const document = resumeDocumentSchema.safeParse(tailored.content);
      if (!document.success) throw new Error("TAILORED_RESUME_INVALID");
      const created = await transaction.applicationResumeVersion.create({
        data: {
          applicationId: match.applicationId,
          sourceResumeDraftId: tailored.id,
          resumeTitle: document.data.title || tailored.title,
          resumeContent: document.data as unknown as Prisma.InputJsonValue,
          jobTitle: match.resumeVersion.jobTitle,
          company: match.resumeVersion.company,
          jobDescription: match.resumeVersion.jobDescription,
          requiredSkills: match.resumeVersion.requiredSkills,
          isSubmitted: true,
          submittedAt: new Date(),
        },
        select: { id: true },
      });
      submittedVersionId = created.id;
    } else {
      await transaction.applicationResumeVersion.update({
        where: { id: match.resumeVersionId },
        data: { isSubmitted: true, submittedAt: new Date() },
      });
    }

    await transaction.application.update({
      where: { id: match.applicationId },
      data: { matchScore: result.data.overallScore },
    });
  });

  return NextResponse.json({ success: true, submittedVersionId });
}
