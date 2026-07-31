-- CreateTable
CREATE TABLE "SavedResumeAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "importedDraft" JSONB,
    "appliedImprovementIndexes" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "draftImportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedResumeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedResumeAnalysis_userId_key" ON "SavedResumeAnalysis"("userId");

-- CreateIndex
CREATE INDEX "SavedResumeAnalysis_userId_idx" ON "SavedResumeAnalysis"("userId");
