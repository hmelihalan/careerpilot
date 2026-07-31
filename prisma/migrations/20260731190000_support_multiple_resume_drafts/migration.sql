-- Preserve the existing resume row while allowing each user to own multiple drafts.
DROP INDEX "ResumeDraft_userId_key";

CREATE INDEX "ResumeDraft_userId_updatedAt_idx"
ON "ResumeDraft"("userId", "updatedAt");
