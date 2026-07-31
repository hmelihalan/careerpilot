import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { resumeDocumentSchema } from "@/src/lib/resume-builder/schema";
import type { Prisma } from "@/src/generated/prisma/client";

export const runtime = "nodejs";

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

  const parsed = resumeDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse(
      "Some resume fields are invalid or too long.",
      "invalid_resume",
      400,
    );
  }

  const content = parsed.data as unknown as Prisma.InputJsonValue;

  try {
    const draft = await prisma.resumeDraft.upsert({
      where: { userId },
      create: {
        userId,
        title: parsed.data.title,
        language: parsed.data.language,
        content,
      },
      update: {
        title: parsed.data.title,
        language: parsed.data.language,
        content,
      },
      select: { updatedAt: true },
    });

    return NextResponse.json({ savedAt: draft.updatedAt.toISOString() });
  } catch {
    return errorResponse(
      "Your resume could not be saved. Please try again.",
      "save_failed",
      500,
    );
  }
}
