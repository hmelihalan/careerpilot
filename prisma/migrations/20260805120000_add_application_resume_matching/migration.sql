-- CreateTable
CREATE TABLE "ApplicationResumeVersion" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "sourceResumeDraftId" TEXT,
    "resumeTitle" TEXT NOT NULL,
    "resumeContent" JSONB NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationResumeMatch" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "acceptedSuggestionIndexes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "rejectedSuggestionIndexes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "provider" TEXT,
    "model" TEXT,
    "tailoredResumeDraftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationResumeMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationResumeVersion_applicationId_createdAt_idx" ON "ApplicationResumeVersion"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationResumeVersion_applicationId_isSubmitted_idx" ON "ApplicationResumeVersion"("applicationId", "isSubmitted");

-- CreateIndex
CREATE INDEX "ApplicationResumeVersion_sourceResumeDraftId_idx" ON "ApplicationResumeVersion"("sourceResumeDraftId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationResumeMatch_resumeVersionId_key" ON "ApplicationResumeMatch"("resumeVersionId");

-- CreateIndex
CREATE INDEX "ApplicationResumeMatch_applicationId_createdAt_idx" ON "ApplicationResumeMatch"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationResumeMatch_tailoredResumeDraftId_idx" ON "ApplicationResumeMatch"("tailoredResumeDraftId");

-- AddForeignKey
ALTER TABLE "ApplicationResumeVersion" ADD CONSTRAINT "ApplicationResumeVersion_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationResumeVersion" ADD CONSTRAINT "ApplicationResumeVersion_sourceResumeDraftId_fkey" FOREIGN KEY ("sourceResumeDraftId") REFERENCES "ResumeDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationResumeMatch" ADD CONSTRAINT "ApplicationResumeMatch_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationResumeMatch" ADD CONSTRAINT "ApplicationResumeMatch_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ApplicationResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationResumeMatch" ADD CONSTRAINT "ApplicationResumeMatch_tailoredResumeDraftId_fkey" FOREIGN KEY ("tailoredResumeDraftId") REFERENCES "ResumeDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
