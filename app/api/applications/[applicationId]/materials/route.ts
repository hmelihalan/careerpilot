import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "../../../../../src/generated/prisma/client";
import { interviewQuestionsSchema } from "../../../../../src/lib/application-materials/schema";
import { prisma } from "../../../../../src/lib/prisma";
import { resumeDocumentSchema } from "../../../../../src/lib/resume-builder/schema";
import { generateApplicationMaterials } from "../../../../../src/server/application-materials/generate-application-materials";
import { ResumeAnalysisServiceError } from "../../../../../src/server/resume-analysis/analyze-resume";

export const runtime = "nodejs";
export const maxDuration = 120;

const generateRequestSchema = z.object({ resumeId: z.string().trim().min(1).max(100) }).strict();
const saveRequestSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("edit"),
      materialId: z.string().trim().min(1).max(100),
      kind: z.enum(["coverLetter", "followUpMessage"]),
      content: z.string().trim().min(1).max(6_000),
    })
    .strict(),
  z
    .object({
      action: z.literal("mark_submitted"),
      materialId: z.string().trim().min(1).max(100),
    })
    .strict(),
]);

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function toResponse(material: {
  id: string;
  resumeDraftId: string | null;
  resumeTitle: string;
  coverLetter: string;
  followUpMessage: string;
  interviewQuestions: Prisma.JsonValue;
  isSubmitted: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const questions = interviewQuestionsSchema.safeParse(material.interviewQuestions);
  return {
    id: material.id,
    resumeDraftId: material.resumeDraftId,
    resumeTitle: material.resumeTitle,
    coverLetter: material.coverLetter,
    followUpMessage: material.followUpMessage,
    interviewQuestions: questions.success ? questions.data : [],
    isSubmitted: material.isSubmitted,
    submittedAt: material.submittedAt?.toISOString() ?? null,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Sign in to generate application materials.", "unauthorized", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("The generation request is invalid.", "invalid_json", 400);
  }

  const parsed = generateRequestSchema.safeParse(input);
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
      "Add the job description before generating application materials.",
      "missing_job_description",
      400,
    );
  }

  const resume = resumeDocumentSchema.safeParse(resumeRecord.content);
  if (!resume.success) {
    return errorResponse("The selected resume could not be read.", "invalid_resume", 400);
  }
  const hasResumeSource = Boolean(
    resume.data.summary.trim() ||
      resume.data.skills.some((skill) => skill.trim()) ||
      resume.data.experience.some(
        (item) =>
          item.role.trim() ||
          item.company.trim() ||
          item.bullets.some((bullet) => bullet.trim()),
      ) ||
      resume.data.education.some(
        (item) => item.school.trim() || item.degree.trim() || item.details.trim(),
      ) ||
      resume.data.projects.some(
        (item) => item.name.trim() || item.description.trim(),
      ),
  );
  if (!hasResumeSource) {
    return errorResponse(
      "Add experience, skills, education, or projects to the selected resume first.",
      "insufficient_resume_content",
      400,
    );
  }

  try {
    const generated = await generateApplicationMaterials({
      company: application.company,
      role: application.role,
      jobDescription: application.description,
      requiredSkills: application.requiredSkills,
      resume: resume.data,
    });
    const material = await prisma.applicationMaterial.create({
      data: {
        applicationId: application.id,
        resumeDraftId: resumeRecord.id,
        resumeTitle: resume.data.title || resumeRecord.title,
        coverLetter: generated.coverLetter,
        followUpMessage: generated.followUpMessage,
        interviewQuestions:
          generated.interviewQuestions as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ material: toResponse(material) }, { status: 201 });
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
      "Application materials could not be generated. Please try again.",
      "generation_failed",
      500,
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Sign in to save application materials.", "unauthorized", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("The save request is invalid.", "invalid_json", 400);
  }

  const parsed = saveRequestSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Enter valid content before saving.", "invalid_request", 400);

  const { applicationId: slug } = await params;
  const material = await prisma.applicationMaterial.findFirst({
    where: {
      id: parsed.data.materialId,
      application: { userId, slug },
    },
    select: { id: true, applicationId: true, isSubmitted: true },
  });
  if (!material) {
    return errorResponse("Material version not found.", "not_found", 404);
  }

  if (parsed.data.action === "edit") {
    if (material.isSubmitted) {
      return errorResponse(
        "The sent material version is locked. Generate a new version to make changes.",
        "submitted_version_locked",
        409,
      );
    }
    await prisma.applicationMaterial.update({
      where: { id: material.id },
      data: { [parsed.data.kind]: parsed.data.content },
    });
    return NextResponse.json({ success: true });
  }

  await prisma.$transaction([
    prisma.applicationMaterial.updateMany({
      where: { applicationId: material.applicationId, isSubmitted: true },
      data: { isSubmitted: false, submittedAt: null },
    }),
    prisma.applicationMaterial.update({
      where: { id: material.id },
      data: { isSubmitted: true, submittedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
