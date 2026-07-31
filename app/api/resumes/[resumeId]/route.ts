import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Sign in to delete a resume.", "unauthorized", 401);
  }

  const { resumeId } = await params;

  try {
    const result = await prisma.resumeDraft.deleteMany({
      where: { id: resumeId, userId },
    });

    if (result.count === 0) {
      return errorResponse("Resume not found.", "not_found", 404);
    }

    return NextResponse.json({ deleted: true });
  } catch {
    return errorResponse(
      "Your resume could not be deleted. Please try again.",
      "delete_failed",
      500,
    );
  }
}
