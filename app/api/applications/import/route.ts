import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ApplicationImportServiceError,
  importApplication,
} from "@/src/server/applications/import-application";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal("description"),
      description: z.string().trim().min(100).max(50_000),
      url: z.string().max(2_000).optional().default(""),
    })
    .strict(),
  z
    .object({
      method: z.literal("url"),
      description: z.string().trim().max(50_000).optional().default(""),
      url: z.string().trim().min(1).max(2_000),
    })
    .strict(),
]);

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to import a job.", "unauthorized", 401);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorResponse(
      "Enter a valid LinkedIn job URL or a job description of at least 100 characters.",
      "invalid_request",
      400,
    );
  }

  try {
    const application = await importApplication(parsed.data);
    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof ApplicationImportServiceError) {
      const status = {
        invalid_linkedin_url: 400,
        description_required: 422,
        provider_not_configured: 503,
        provider_unavailable: 502,
        provider_rejected: 502,
        rate_limited: 429,
        invalid_model_output: 502,
      }[error.code];
      return errorResponse(error.message, error.code, status);
    }

    return errorResponse(
      "The job could not be imported. Try again.",
      "import_failed",
      500,
    );
  }
}
