import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to delete a resume analysis.", "unauthorized", 401);
  }

  const { analysisId } = await params;

  try {
    const deleted = await prisma.savedResumeAnalysis.deleteMany({
      where: { id: analysisId, userId },
    });
    if (deleted.count === 0) {
      return errorResponse("Resume analysis not found.", "not_found", 404);
    }
    return NextResponse.json({ deleted: true });
  } catch {
    return errorResponse(
      "The resume analysis could not be deleted. Please try again.",
      "delete_failed",
      500,
    );
  }
}
