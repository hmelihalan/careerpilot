-- CreateTable
CREATE TABLE "ApplicationMaterial" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "resumeDraftId" TEXT,
    "resumeTitle" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "followUpMessage" TEXT NOT NULL,
    "interviewQuestions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationMaterial_applicationId_key" ON "ApplicationMaterial"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationMaterial_resumeDraftId_idx" ON "ApplicationMaterial"("resumeDraftId");

-- AddForeignKey
ALTER TABLE "ApplicationMaterial" ADD CONSTRAINT "ApplicationMaterial_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationMaterial" ADD CONSTRAINT "ApplicationMaterial_resumeDraftId_fkey" FOREIGN KEY ("resumeDraftId") REFERENCES "ResumeDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
