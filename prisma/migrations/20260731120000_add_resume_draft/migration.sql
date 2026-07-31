-- CreateTable
CREATE TABLE "ResumeDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeDraft_userId_key" ON "ResumeDraft"("userId");

-- CreateIndex
CREATE INDEX "ResumeDraft_userId_idx" ON "ResumeDraft"("userId");
