-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'REFERRAL', 'OTHER');

-- CreateTable
CREATE TABLE "ApplicationContact" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactType" "ContactType" NOT NULL DEFAULT 'RECRUITER',
    "role" TEXT,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "reminderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationContact_reminderId_key" ON "ApplicationContact"("reminderId");

-- CreateIndex
CREATE INDEX "ApplicationContact_applicationId_updatedAt_idx" ON "ApplicationContact"("applicationId", "updatedAt");

-- CreateIndex
CREATE INDEX "ApplicationContact_nextFollowUpAt_idx" ON "ApplicationContact"("nextFollowUpAt");

-- AddForeignKey
ALTER TABLE "ApplicationContact" ADD CONSTRAINT "ApplicationContact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationContact" ADD CONSTRAINT "ApplicationContact_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "ApplicationReminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
