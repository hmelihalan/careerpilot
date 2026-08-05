import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to view the original resume.", "unauthorized", 401);
  }

  const analysisId = new URL(request.url).searchParams.get("analysisId");
  if (!analysisId) {
    return errorResponse("The resume reference is missing.", "missing_analysis", 400);
  }

  const saved = await prisma.savedResumeAnalysis.findFirst({
    where: { id: analysisId, userId },
    select: {
      fileName: true,
      originalFile: true,
      originalMimeType: true,
    },
  });

  if (
    !saved?.originalFile ||
    (saved.originalMimeType !== "application/pdf" &&
      saved.originalMimeType !== "text/plain")
  ) {
    return errorResponse("The original resume is not available.", "not_found", 404);
  }

  const safeName =
    saved.fileName
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "resume.pdf";
  return new Response(saved.originalFile, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Length": String(saved.originalFile.byteLength),
      "Content-Type": `${saved.originalMimeType}${
        saved.originalMimeType === "text/plain" ? "; charset=utf-8" : ""
      }`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
