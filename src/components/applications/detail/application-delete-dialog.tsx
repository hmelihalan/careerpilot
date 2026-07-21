"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { appRoutes } from "@/src/constants/navigation";
import { deleteApplication } from "@/src/server/actions/applications/delete-application";

type ApplicationDeleteDialogProps = {
  slug: string;
  company: string;
  role: string;
};

export function ApplicationDeleteDialog({
  slug,
  company,
  role,
}: ApplicationDeleteDialogProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;

    if (nextOpen) {
      setFormError(undefined);
    }

    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || isPending) return;

    submittingRef.current = true;
    setFormError(undefined);

    startTransition(async () => {
      try {
        const result = await deleteApplication({ slug });

        if (!result.success) {
          setFormError(result.formError);
          return;
        }

        setOpen(false);
        router.replace(appRoutes.authenticated.applications);
        router.refresh();
      } catch {
        setFormError("We couldn’t delete this application. Please try again.");
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="destructive" size="sm" className="rounded-lg" />
        }
      >
        <Trash2 data-icon="inline-start" aria-hidden="true" />
        Delete
      </DialogTrigger>
      <DialogContent showCloseButton={!isPending} className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <div className="flex items-start gap-3 pr-8">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-red-100">
                <AlertTriangle className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base text-slate-950">
                  Delete application?
                </DialogTitle>
                <DialogDescription className="mt-2 leading-6 text-slate-600">
                  This will permanently delete the application, its notes, and its
                  status history. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900">{role}</p>
            <p className="mt-0.5 text-xs text-slate-500">{company}</p>
          </div>

          {formError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            >
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Trash2 data-icon="inline-start" aria-hidden="true" />
              )}
              {isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
