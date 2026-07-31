import { auth } from "@clerk/nextjs/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { ResumePdfDocument } from "@/src/components/resume-builder/resume-pdf-document";
import { resumeDocumentSchema } from "@/src/lib/resume-builder/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function safeFileName(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "resume";
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to download your resume.", "unauthorized", 401);
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

  try {
    const buffer = await renderToBuffer(
      ResumePdfDocument({ draft: parsed.data }),
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${safeFileName(parsed.data.title)}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch {
    return errorResponse(
      "The PDF could not be generated. Please try again.",
      "pdf_failed",
      500,
    );
  }
}
