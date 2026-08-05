-- DropIndex
DROP INDEX "SavedResumeAnalysis_userId_key";

-- AlterTable
ALTER TABLE "SavedResumeAnalysis"
ADD COLUMN "provider" TEXT,
ADD COLUMN "model" TEXT,
ADD COLUMN "characterCount" INTEGER;

-- CreateIndex
CREATE INDEX "SavedResumeAnalysis_userId_updatedAt_idx" ON "SavedResumeAnalysis"("userId", "updatedAt");
