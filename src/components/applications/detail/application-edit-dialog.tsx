"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, LoaderCircle, MapPin, Pencil } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApplicationFormFields } from "@/src/components/applications/create/application-form-fields";
import { updateApplication } from "@/src/server/actions/applications/update-application";
import type {
  ApplicationEditFieldErrors,
  ApplicationEditFormData,
  DuplicateApplicationReason,
  DuplicateApplicationSummary,
} from "@/src/types/application";

const editEmploymentTypeOptions = [
  "Internship",
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Other",
] as const;

const editFieldNames = [
  "company",
  "role",
  "location",
  "workMode",
  "employmentType",
  "source",
  "applicationUrl",
  "deadline",
  "requiredSkills",
  "description",
  "salaryMin",
  "salaryMax",
  "currency",
  "appliedAt",
] as const satisfies readonly (keyof ApplicationEditFormData)[];

type ApplicationEditDialogProps = {
  slug: string;
  initialValues: ApplicationEditFormData;
};

type DuplicateState = {
  reason: DuplicateApplicationReason;
  application: DuplicateApplicationSummary;
};

type EditTextFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  type?: "text" | "number" | "date";
  placeholder?: string;
  onChange: (value: string) => void;
};

function cloneInitialValues(
  initialValues: ApplicationEditFormData,
): ApplicationEditFormData {
  return {
    ...initialValues,
    requiredSkills: [...initialValues.requiredSkills],
  };
}

function EditTextField({
  id,
  label,
  value,
  error,
  type = "text",
  placeholder,
  onChange,
}: EditTextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-slate-700">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? 1 : undefined}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="h-9 border-slate-200 bg-white"
      />
      {error ? (
        <p id={errorId} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ApplicationEditDialog({
  slug,
  initialValues,
}: ApplicationEditDialogProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ApplicationEditFormData>(() =>
    cloneInitialValues(initialValues),
  );
  const [fieldErrors, setFieldErrors] =
    useState<ApplicationEditFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [duplicate, setDuplicate] = useState<DuplicateState>();
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;

    if (nextOpen) {
      setFormData(cloneInitialValues(initialValues));
      setFieldErrors({});
      setFormError(undefined);
      setDuplicate(undefined);
    }

    setOpen(nextOpen);
  }

  function handleChange<Field extends keyof ApplicationEditFormData>(
    field: Field,
    value: ApplicationEditFormData[Field],
  ) {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
    setDuplicate(undefined);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || isPending) return;

    submittingRef.current = true;
    setFieldErrors({});
    setFormError(undefined);
    setDuplicate(undefined);

    startTransition(async () => {
      try {
        const result = await updateApplication({ slug, ...formData });

        if (!result.success) {
          if (result.reason === "duplicate") {
            setDuplicate({
              reason: result.duplicateReason,
              application: result.duplicate,
            });
            setFormError(result.formError);
            return;
          }

          const nextFieldErrors: ApplicationEditFieldErrors = {};
          editFieldNames.forEach((field) => {
            const message = result.fieldErrors?.[field]?.[0];
            if (message) nextFieldErrors[field] = message;
          });
          setFieldErrors(nextFieldErrors);
          setFormError(result.formError);
          return;
        }

        setOpen(false);
        router.refresh();
      } catch {
        setFormError("We couldn’t update this application. Please try again.");
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="rounded-lg" />
        }
      >
        <Pencil data-icon="inline-start" aria-hidden="true" />
        Edit
      </DialogTrigger>
      <DialogContent
        showCloseButton={!isPending}
        className="grid h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-lg sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 sm:px-6">
            <DialogTitle className="text-lg text-slate-950">
              Edit Application
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Update the saved job and application details. Status is managed separately.
            </DialogDescription>
          </DialogHeader>

          <div className="scrollbar-thin min-h-0 overflow-y-auto bg-slate-50/70 px-4 py-4 sm:px-6">
            <fieldset
              disabled={isPending}
              className="mx-auto max-w-3xl space-y-4 border-0 p-0"
            >
              {formError ? (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                  role="alert"
                >
                  {formError}
                </div>
              ) : null}

              {duplicate ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200">
                      <Copy className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-amber-950">
                        {duplicate.reason === "url"
                          ? "This job URL belongs to another application."
                          : "These company, role, and location details match another application."}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {duplicate.application.role}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {duplicate.application.company}
                      </p>
                      {duplicate.application.location ? (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="size-3.5" aria-hidden="true" />
                          {duplicate.application.location}
                        </p>
                      ) : null}
                      <Link
                        href={`/applications/${duplicate.application.slug}`}
                        className="mt-3 inline-flex rounded text-xs font-medium text-amber-800 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                      >
                        View existing application
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}

              <ApplicationFormFields
                application={formData}
                errors={fieldErrors}
                employmentTypeOptions={editEmploymentTypeOptions}
                onChange={(field, value) => handleChange(field, value)}
              />

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-medium text-slate-900">
                  Compensation
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <EditTextField
                    id="application-salary-min"
                    label="Minimum Salary"
                    type="number"
                    value={formData.salaryMin}
                    error={fieldErrors.salaryMin}
                    placeholder="60000"
                    onChange={(value) => handleChange("salaryMin", value)}
                  />
                  <EditTextField
                    id="application-salary-max"
                    label="Maximum Salary"
                    type="number"
                    value={formData.salaryMax}
                    error={fieldErrors.salaryMax}
                    placeholder="80000"
                    onChange={(value) => handleChange("salaryMax", value)}
                  />
                  <EditTextField
                    id="application-currency"
                    label="Currency"
                    value={formData.currency}
                    error={fieldErrors.currency}
                    placeholder="USD"
                    onChange={(value) => handleChange("currency", value)}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-medium text-slate-900">
                  Application Timeline
                </h3>
                <div className="max-w-xs">
                  <EditTextField
                    id="application-applied-at"
                    label="Application Date"
                    type="date"
                    value={formData.appliedAt}
                    error={fieldErrors.appliedAt}
                    onChange={(value) => handleChange("appliedAt", value)}
                  />
                </div>
              </section>
            </fieldset>
          </div>

          <DialogFooter className="m-0 flex-row rounded-none bg-white px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
