import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { resumeDocumentSchema } from "@/src/lib/resume-builder/schema";
import { ResumeAnalysisServiceError } from "@/src/server/resume-analysis/analyze-resume";
import { improveResumeContent } from "@/src/server/resume-builder/improve-resume-content";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z
  .object({
    kind: z.enum(["summary", "experience"]),
    draft: resumeDocumentSchema,
    experienceId: z.string().max(100).optional(),
  })
  .strict();

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to use AI assistance.", "unauthorized", 401);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("The writing request is invalid.", "invalid_json", 400);
  }

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse("The writing request is invalid.", "invalid_request", 400);
  }

  const { draft, kind, experienceId } = parsed.data;
  const selectedExperience = draft.experience.find(
    (item) => item.id === experienceId,
  );
  const hasSummarySource = Boolean(
    draft.contact.headline.trim() ||
      draft.summary.trim() ||
      draft.skills.some((skill) => skill.trim()) ||
      draft.experience.some(
        (item) =>
          item.role.trim() ||
          item.company.trim() ||
          item.bullets.some((bullet) => bullet.trim()),
      ) ||
      draft.education.some(
        (item) => item.school.trim() || item.degree.trim() || item.details.trim(),
      ) ||
      draft.projects.some(
        (item) => item.name.trim() || item.description.trim(),
      ),
  );
  const hasExperienceSource = Boolean(
    selectedExperience?.bullets.some((bullet) => bullet.trim()),
  );

  if (
    (kind === "summary" && !hasSummarySource) ||
    (kind === "experience" && !hasExperienceSource)
  ) {
    return errorResponse(
      kind === "summary"
        ? "Add some experience, skills, or project details first."
        : "Add rough achievement notes first.",
      "insufficient_content",
      400,
    );
  }

  const source =
    kind === "summary"
      ? JSON.stringify({
          headline: draft.contact.headline,
          currentSummary: draft.summary,
          experience: draft.experience.map(({ role, company, bullets }) => ({
            role,
            company,
            bullets,
          })),
          education: draft.education.map(({ school, degree, details }) => ({
            school,
            degree,
            details,
          })),
          skills: draft.skills,
          projects: draft.projects,
        })
      : JSON.stringify(
          selectedExperience ?? null,
        );

  try {
    const suggestions = await improveResumeContent({
      kind,
      language: draft.language,
      source,
    });
    return NextResponse.json({ suggestions });
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
      "AI assistance failed unexpectedly. Please try again.",
      "writing_failed",
      500,
    );
  }
}
