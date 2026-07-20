import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicationFormFields } from "@/src/components/applications/create/application-form-fields";
import type {
  ApplicationCreationStatus,
  ApplicationFieldErrors,
  ApplicationFormData,
} from "@/src/types/application";

type ReviewApplicationStepProps = {
  application: ApplicationFormData;
  errors: ApplicationFieldErrors;
  wasAnalyzed: boolean;
  onChange: <Field extends keyof ApplicationFormData>(
    field: Field,
    value: ApplicationFormData[Field],
  ) => void;
  onBack: () => void;
  onCancel: () => void;
  onSave: (status: ApplicationCreationStatus) => void;
};

export function ReviewApplicationStep({
  application,
  errors,
  wasAnalyzed,
  onChange,
  onBack,
  onCancel,
  onSave,
}: ReviewApplicationStepProps) {
  return (
    <>
      <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 sm:px-6">
        <DialogTitle className="text-lg text-slate-950">Review Application</DialogTitle>
        <DialogDescription className="text-slate-500">
          Check the extracted details before saving the application.
        </DialogDescription>
      </DialogHeader>

      <div className="scrollbar-thin min-h-0 overflow-y-auto bg-slate-50/70 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {wasAnalyzed ? (
            <div
              className="mb-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs font-medium text-indigo-700"
              role="status"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              Job details extracted successfully
            </div>
          ) : (
            <p className="mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
              Manual entry mode — complete the required fields to continue.
            </p>
          )}

          <ApplicationFormFields
            application={application}
            errors={errors}
            onChange={onChange}
          />
        </div>
      </div>

      <DialogFooter className="m-0 flex-col rounded-none bg-white px-4 py-3 sm:flex-row sm:px-6">
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSave("Wishlist")}
            >
              Save as Wishlist
            </Button>
            <Button type="button" onClick={() => onSave("Applied")}>
              Save as Applied
            </Button>
          </div>
        </div>
      </DialogFooter>
    </>
  );
}
