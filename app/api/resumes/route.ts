import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import type { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { createEmptyResumeDocument } from "@/src/lib/resume-builder/schema";

export const runtime = "nodejs";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to create a resume.", "unauthorized", 401);
  }

  try {
    const resumeCount = await prisma.resumeDraft.count({ where: { userId } });
    const title = resumeCount === 0 ? "My Resume" : `My Resume ${resumeCount + 1}`;
    const document = { ...createEmptyResumeDocument(), title };
    const content = document as unknown as Prisma.InputJsonValue;
    const resume = await prisma.resumeDraft.create({
      data: {
        userId,
        title,
        language: document.language,
        content,
      },
      select: { id: true },
    });

    return NextResponse.json({ resumeId: resume.id }, { status: 201 });
  } catch {
    return errorResponse(
      "Your resume could not be created. Please try again.",
      "create_failed",
      500,
    );
  }
}
