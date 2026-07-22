import type { ResumeParseStatus } from "@/src/generated/prisma/enums";

export type ResumeListItemViewModel = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isDefault: boolean;
  parseStatus: ResumeParseStatus;
  createdAt: string;
  updatedAt: string;
};
