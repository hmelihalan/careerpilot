import type { ApplicationStatus } from "@/src/generated/prisma/enums";

type ApplicationStatusTransitionInput = {
  currentStatus: ApplicationStatus;
  targetStatus: ApplicationStatus;
  appliedAt: Date | null;
};

export type ApplicationStatusTransition =
  | {
      changed: false;
      applicationData: null;
      historyData: null;
    }
  | {
      changed: true;
      applicationData: {
        status: ApplicationStatus;
        appliedAt?: Date;
      };
      historyData: {
        fromStatus: ApplicationStatus;
        toStatus: ApplicationStatus;
      };
    };

export function getApplicationStatusTransition(
  input: ApplicationStatusTransitionInput,
  now: Date = new Date(),
): ApplicationStatusTransition {
  if (input.currentStatus === input.targetStatus) {
    return {
      changed: false,
      applicationData: null,
      historyData: null,
    };
  }

  const shouldSetAppliedAt =
    input.targetStatus === "APPLIED" && input.appliedAt === null;

  return {
    changed: true,
    applicationData: {
      status: input.targetStatus,
      ...(shouldSetAppliedAt ? { appliedAt: now } : {}),
    },
    historyData: {
      fromStatus: input.currentStatus,
      toStatus: input.targetStatus,
    },
  };
}
