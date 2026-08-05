import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { applyAcceptedResumeMatchSuggestions } from "@/src/lib/resume-match/apply-suggestions";
import { resumeMatchResultSchema } from "@/src/lib/resume-match/schema";
import { resumeDocumentSchema } from "@/src/lib/resume-builder/schema";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function tailoredTitle(source: string, company: string, role: string): string {
  const suffix = `${company} ${role}`.trim();
  return `${source} — ${suffix}`.slice(0, 120);
}

export async function POST(
  _request: Request,
  {
    params,
  }: { params: Promise<{ applicationId: string; matchId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to create a tailored resume.", "unauthorized", 401);
  }
  const { applicationId: slug, matchId } = await params;
  const match = await prisma.applicationResumeMatch.findFirst({
    where: { id: matchId, application: { userId, slug } },
    include: { resumeVersion: true },
  });
  if (!match) return errorResponse("Resume match not found.", "not_found", 404);
  if (match.acceptedSuggestionIndexes.length === 0) {
    return errorResponse(
      "Accept at least one suggestion before creating a tailored copy.",
      "no_accepted_suggestions",
      400,
    );
  }

  const [source, result] = [
    resumeDocumentSchema.safeParse(match.resumeVersion.resumeContent),
    resumeMatchResultSchema.safeParse(match.result),
  ];
  if (!source.success || !result.success) {
    return errorResponse("The saved resume match is invalid.", "invalid_match", 409);
  }

  const tailored = applyAcceptedResumeMatchSuggestions(
    source.data,
    result.data,
    match.acceptedSuggestionIndexes,
  );
  if (tailored.changes.length === 0) {
    return errorResponse(
      "The accepted suggestions no longer match the saved resume snapshot.",
      "stale_suggestions",
      409,
    );
  }
  const title = tailoredTitle(
    match.resumeVersion.resumeTitle,
    match.resumeVersion.company,
    match.resumeVersion.jobTitle,
  );
  const document = { ...tailored.draft, title };

  const resume = await prisma.$transaction(async (transaction) => {
    const created = await transaction.resumeDraft.create({
      data: {
        userId,
        title,
        language: document.language,
        content: document as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    await transaction.applicationResumeMatch.update({
      where: { id: match.id },
      data: { tailoredResumeDraftId: created.id },
    });
    return created;
  });

  return NextResponse.json(
    {
      resumeId: resume.id,
      href: `/resume-builder?resume=${encodeURIComponent(resume.id)}&match=${encodeURIComponent(match.id)}`,
      changes: tailored.changes,
    },
    { status: 201 },
  );
}
