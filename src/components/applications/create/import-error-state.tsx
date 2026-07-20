import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImportErrorStateProps = {
  onRetry: () => void;
  onManualEntry: () => void;
  onCancel: () => void;
};

export function ImportErrorState({
  onRetry,
  onManualEntry,
  onCancel,
}: ImportErrorStateProps) {
  return (
    <>
      <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 sm:px-6">
        <DialogTitle className="text-lg text-slate-950">Add Application</DialogTitle>
        <DialogDescription className="text-slate-500">
          The imported job needs another pass.
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-80 items-center justify-center overflow-y-auto px-6 py-10">
        <div className="max-w-md text-center" role="alert">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <CircleAlert className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-base font-medium text-slate-950">
            We couldn’t extract the job details
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            The job information could not be identified reliably. Try the
            import again, or continue with empty editable fields.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onRetry}>
              Retry
            </Button>
            <Button type="button" onClick={onManualEntry}>
              Enter Details Manually
            </Button>
          </div>
        </div>
      </div>
      <DialogFooter className="m-0 rounded-none bg-slate-50 px-5 py-3 sm:px-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}
