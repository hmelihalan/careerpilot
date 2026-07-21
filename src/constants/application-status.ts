import { ApplicationStatus as PrismaApplicationStatus } from "@/src/generated/prisma/enums";
import type { ApplicationStatus as UiApplicationStatus } from "@/src/types/application";

export type PrismaApplicationStatusValue =
  (typeof PrismaApplicationStatus)[keyof typeof PrismaApplicationStatus];

type ApplicationStatusMeta = {
  label: UiApplicationStatus;
  badgeClassName: string;
};

/**
 * Single source of truth for the Prisma ApplicationStatus enum: display
 * label, badge style, and board/select order. Client-safe (no server-only
 * imports) so it can be shared by server mappings, the applications board,
 * the applications list, and the status update control.
 */
export const APPLICATION_STATUS_META = {
  [PrismaApplicationStatus.WISHLIST]: {
    label: "Wishlist",
    badgeClassName: "bg-slate-100 text-slate-700",
  },
  [PrismaApplicationStatus.APPLIED]: {
    label: "Applied",
    badgeClassName: "bg-blue-50 text-blue-700",
  },
  [PrismaApplicationStatus.ASSESSMENT]: {
    label: "Assessment",
    badgeClassName: "bg-amber-50 text-amber-700",
  },
  [PrismaApplicationStatus.INTERVIEW]: {
    label: "Interview",
    badgeClassName: "bg-violet-50 text-violet-700",
  },
  [PrismaApplicationStatus.OFFER]: {
    label: "Offer",
    badgeClassName: "bg-emerald-50 text-emerald-700",
  },
  [PrismaApplicationStatus.REJECTED]: {
    label: "Rejected",
    badgeClassName: "bg-rose-50 text-rose-700",
  },
} as const satisfies Record<PrismaApplicationStatusValue, ApplicationStatusMeta>;

export const APPLICATION_STATUS_VALUES = Object.keys(
  APPLICATION_STATUS_META,
) as [PrismaApplicationStatusValue, ...PrismaApplicationStatusValue[]];

/** Canonical display/board-column order (Wishlist → Applied → ... → Rejected). */
export const APPLICATION_STATUS_ORDER: readonly PrismaApplicationStatusValue[] =
  APPLICATION_STATUS_VALUES;

export const APPLICATION_STATUS_LABELS: readonly UiApplicationStatus[] =
  APPLICATION_STATUS_ORDER.map((value) => APPLICATION_STATUS_META[value].label);

export const applicationStatusBadgeStyles: Record<UiApplicationStatus, string> =
  Object.fromEntries(
    Object.values(APPLICATION_STATUS_META).map((meta) => [
      meta.label,
      meta.badgeClassName,
    ]),
  ) as Record<UiApplicationStatus, string>;

export function getApplicationStatusLabel(
  value: PrismaApplicationStatusValue,
): UiApplicationStatus {
  return APPLICATION_STATUS_META[value].label;
}
