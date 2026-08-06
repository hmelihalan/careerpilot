-- DropIndex
DROP INDEX "ApplicationMaterial_applicationId_key";

-- AlterTable
ALTER TABLE "ApplicationMaterial"
ADD COLUMN "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "submittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ApplicationMaterial_applicationId_createdAt_idx" ON "ApplicationMaterial"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationMaterial_applicationId_isSubmitted_idx" ON "ApplicationMaterial"("applicationId", "isSubmitted");
