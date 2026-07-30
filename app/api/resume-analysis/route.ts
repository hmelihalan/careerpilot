import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  analyzeResumeText,
  getResumeAnalysisRuntime,
  ResumeAnalysisServiceError,
} from "@/src/server/resume-analysis/analyze-resume";
import {
  extractResumeText,
  ResumeFileError,
} from "@/src/server/resume-analysis/extract-resume-text";

export const runtime = "nodejs";
export const maxDuration = 120;

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to analyze a resume.", "unauthorized", 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("The upload request is invalid.", "invalid_upload", 400);
  }

  const resume = formData.get("resume");
  if (!(resume instanceof File)) {
    return errorResponse("Choose a resume file to analyze.", "missing_file", 400);
  }

  try {
    const resumeText = await extractResumeText(resume);
    const analysis = await analyzeResumeText(resumeText);
    const analysisRuntime = getResumeAnalysisRuntime();

    return NextResponse.json({
      analysis,
      metadata: {
        characterCount: resumeText.length,
        fileName: resume.name,
        model: analysisRuntime.model,
        provider: analysisRuntime.provider,
      },
    });
  } catch (error) {
    if (error instanceof ResumeFileError) {
      const status = error.code === "file_too_large" ? 413 : 422;
      return errorResponse(error.message, error.code, status);
    }
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
      "Resume analysis failed unexpectedly. Please try again.",
      "analysis_failed",
      500,
    );
  }
}
