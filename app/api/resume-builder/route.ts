import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/lib/prisma";
import { resumeDocumentSchema } from "@/src/lib/resume-builder/schema";
import type { Prisma } from "@/src/generated/prisma/client";

export const runtime = "nodejs";

const saveResumeSchema = z
  .object({
    resumeId: z.string().min(1).max(100).nullable(),
    draft: resumeDocumentSchema,
  })
  .strict();

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to save your resume.", "unauthorized", 401);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("The resume data is invalid.", "invalid_json", 400);
  }

  const parsed = saveResumeSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse(
      "Some resume fields are invalid or too long.",
      "invalid_resume",
      400,
    );
  }

  const content = parsed.data.draft as unknown as Prisma.InputJsonValue;

  try {
    if (parsed.data.resumeId) {
      const result = await prisma.resumeDraft.updateMany({
        where: { id: parsed.data.resumeId, userId },
        data: {
          title: parsed.data.draft.title,
          language: parsed.data.draft.language,
          content,
        },
      });

      if (result.count === 0) {
        return errorResponse("Resume not found.", "not_found", 404);
      }

      const updatedDraft = await prisma.resumeDraft.findFirst({
        where: { id: parsed.data.resumeId, userId },
        select: { id: true, updatedAt: true },
      });

      if (!updatedDraft) {
        return errorResponse("Resume not found.", "not_found", 404);
      }

      return NextResponse.json({
        resumeId: updatedDraft.id,
        savedAt: updatedDraft.updatedAt.toISOString(),
      });
    }

    const draft = await prisma.resumeDraft.create({
      data: {
        userId,
        title: parsed.data.draft.title,
        language: parsed.data.draft.language,
        content,
      },
      select: { id: true, updatedAt: true },
    });

    return NextResponse.json({
      resumeId: draft.id,
      savedAt: draft.updatedAt.toISOString(),
    });
  } catch {
    return errorResponse(
      "Your resume could not be saved. Please try again.",
      "save_failed",
      500,
    );
  }
}
