-- CreateTable
CREATE TABLE "ApplicationReminder" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationReminder_applicationId_remindAt_idx" ON "ApplicationReminder"("applicationId", "remindAt");

-- CreateIndex
CREATE INDEX "ApplicationReminder_completedAt_remindAt_idx" ON "ApplicationReminder"("completedAt", "remindAt");

-- AddForeignKey
ALTER TABLE "ApplicationReminder" ADD CONSTRAINT "ApplicationReminder_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
