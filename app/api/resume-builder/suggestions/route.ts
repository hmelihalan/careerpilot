import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/lib/prisma";
import { resumeAnalysisSchema } from "@/src/lib/resume-analysis/schema";

const requestSchema = z
  .object({
    analysisId: z.string().min(1).max(100),
    action: z.enum(["import", "apply", "unapply"]),
    improvementIndex: z.number().int().min(0).max(20).optional(),
  })
  .strict();

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to update resume suggestions.", "unauthorized", 401);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("The suggestion update is invalid.", "invalid_request", 400);
  }

  const saved = await prisma.savedResumeAnalysis.findFirst({
    where: { id: parsed.data.analysisId, userId },
  });
  if (!saved) {
    return errorResponse("The saved analysis was not found.", "not_found", 404);
  }

  if (parsed.data.action === "import") {
    await prisma.savedResumeAnalysis.update({
      where: { id: saved.id },
      data: { draftImportedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  const improvementIndex = parsed.data.improvementIndex;
  const analysis = resumeAnalysisSchema.safeParse(saved.analysis);
  if (
    improvementIndex === undefined ||
    !analysis.success ||
    improvementIndex >= analysis.data.improvements.length
  ) {
    return errorResponse("The suggestion was not found.", "invalid_suggestion", 400);
  }

  const indexes = new Set(saved.appliedImprovementIndexes);
  if (parsed.data.action === "apply") indexes.add(improvementIndex);
  else indexes.delete(improvementIndex);

  await prisma.savedResumeAnalysis.update({
    where: { id: saved.id },
    data: { appliedImprovementIndexes: [...indexes].sort((a, b) => a - b) },
  });

  return NextResponse.json({ ok: true });
}
