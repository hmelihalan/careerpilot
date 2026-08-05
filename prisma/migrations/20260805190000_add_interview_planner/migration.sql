-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ApplicationInterview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "interviewerName" TEXT,
    "interviewerRole" TEXT,
    "location" TEXT,
    "meetingUrl" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "reminderMinutesBefore" INTEGER,
    "reminderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationInterview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationInterview_reminderId_key" ON "ApplicationInterview"("reminderId");

-- CreateIndex
CREATE INDEX "ApplicationInterview_applicationId_scheduledAt_idx" ON "ApplicationInterview"("applicationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ApplicationInterview_status_scheduledAt_idx" ON "ApplicationInterview"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "ApplicationInterview" ADD CONSTRAINT "ApplicationInterview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationInterview" ADD CONSTRAINT "ApplicationInterview_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "ApplicationReminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
