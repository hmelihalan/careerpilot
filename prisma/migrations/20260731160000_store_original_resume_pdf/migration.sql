-- AlterTable
ALTER TABLE "SavedResumeAnalysis"
ADD COLUMN "originalFile" BYTEA,
ADD COLUMN "originalMimeType" TEXT,
ADD COLUMN "originalFileSize" INTEGER;
