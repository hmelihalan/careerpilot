import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import { resumeDocumentSchema } from "@/src/lib/resume-builder/schema";
import { generateResumeMatch } from "@/src/server/resume-match/generate-resume-match";
import { ResumeAnalysisServiceError } from "@/src/server/resume-analysis/analyze-resume";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z
  .object({ resumeId: z.string().trim().min(1).max(100) })
  .strict();

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to match a resume.", "unauthorized", 401);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse("Choose a saved resume first.", "invalid_request", 400);
  }

  const { applicationId: slug } = await params;
  const [application, resumeRecord] = await Promise.all([
    prisma.application.findFirst({
      where: { userId, slug },
      select: {
        id: true,
        company: true,
        role: true,
        description: true,
        requiredSkills: true,
      },
    }),
    prisma.resumeDraft.findFirst({
      where: { userId, id: parsed.data.resumeId },
      select: { id: true, title: true, content: true },
    }),
  ]);

  if (!application) return errorResponse("Application not found.", "not_found", 404);
  if (!resumeRecord) return errorResponse("Saved resume not found.", "resume_not_found", 404);
  if (!application.description?.trim()) {
    return errorResponse(
      "Add the job description before matching a resume.",
      "missing_job_description",
      400,
    );
  }

  const resume = resumeDocumentSchema.safeParse(resumeRecord.content);
  if (!resume.success) {
    return errorResponse("The selected resume could not be read.", "invalid_resume", 400);
  }
  const hasContent = Boolean(
    resume.data.summary.trim() ||
      resume.data.skills.some((skill) => skill.trim()) ||
      resume.data.experience.some((item) =>
        item.bullets.some((bullet) => bullet.trim()),
      ) ||
      resume.data.projects.some((item) => item.description.trim()),
  );
  if (!hasContent) {
    return errorResponse(
      "Add a summary, skills, experience, or projects to the selected resume first.",
      "insufficient_resume_content",
      400,
    );
  }

  try {
    const generated = await generateResumeMatch({
      company: application.company,
      role: application.role,
      jobDescription: application.description,
      requiredSkills: application.requiredSkills,
      resume: resume.data,
    });
    const result = generated.result as unknown as Prisma.InputJsonValue;
    const resumeContent = resume.data as unknown as Prisma.InputJsonValue;
    const version = await prisma.applicationResumeVersion.create({
      data: {
        applicationId: application.id,
        sourceResumeDraftId: resumeRecord.id,
        resumeTitle: resume.data.title || resumeRecord.title,
        resumeContent,
        jobTitle: application.role,
        company: application.company,
        jobDescription: application.description,
        requiredSkills: application.requiredSkills,
        match: {
          create: {
            applicationId: application.id,
            result,
            provider: generated.provider,
            model: generated.model,
          },
        },
      },
      include: { match: true },
    });

    return NextResponse.json(
      { matchId: version.match!.id, score: generated.result.overallScore },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ResumeAnalysisServiceError) {
      const status =
        error.code === "rate_limited"
          ? 429
          : error.code === "provider_not_configured" ||
              error.code === "provider_unavailable"
            ? 503
            : 502;
      return errorResponse(error.message, error.code, status);
    }
    return errorResponse(
      "The resume match could not be generated. Please try again.",
      "generation_failed",
      500,
    );
  }
}
