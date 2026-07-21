"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPLICATION_STATUS_ORDER,
  getApplicationStatusLabel,
  type PrismaApplicationStatusValue,
} from "@/src/constants/application-status";
import { updateApplicationStatus } from "@/src/server/actions/applications/update-application-status";

type ApplicationStatusControlProps = {
  slug: string;
  currentStatus: PrismaApplicationStatusValue;
};

const STATUS_ERROR_ID = "application-status-error";

export function ApplicationStatusControl({
  slug,
  currentStatus,
}: ApplicationStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PrismaApplicationStatusValue>(currentStatus);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleValueChange(nextValue: unknown) {
    if (
      isPending ||
      typeof nextValue !== "string" ||
      nextValue === status
    ) {
      return;
    }

    const nextStatus = nextValue as PrismaApplicationStatusValue;
    const previousStatus = status;

    setStatus(nextStatus);
    setError(undefined);

    startTransition(async () => {
      const result = await updateApplicationStatus({
        slug,
        status: nextStatus,
      });

      if (!result.success) {
        setStatus(previousStatus);
        setError(result.formError);
        return;
      }

      if (result.changed) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <label htmlFor="application-status-select" className="sr-only">
        Application status
      </label>
      <Select
        value={status}
        onValueChange={handleValueChange}
        disabled={isPending}
      >
        <SelectTrigger
          id="application-status-select"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? STATUS_ERROR_ID : undefined}
          className="h-8 min-w-40 rounded-lg border-slate-200 bg-white text-sm"
        >
          {isPending ? (
            <LoaderCircle
              className="size-3.5 shrink-0 animate-spin text-slate-400"
              aria-hidden="true"
            />
          ) : null}
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {APPLICATION_STATUS_ORDER.map((value) => (
            <SelectItem key={value} value={value}>
              {getApplicationStatusLabel(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p
          id={STATUS_ERROR_ID}
          role="alert"
          className="text-xs font-medium text-red-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
