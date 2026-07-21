"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
  type PropsWithChildren,
} from "react";
import { Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPTY_APPLICATION, MOCK_EXTRACTED_APPLICATION, MOCK_IMPORT_ERROR_TOKEN } from "@/src/constants/application";
import { DuplicateApplicationState } from "@/src/components/applications/create/duplicate-application-state";
import { ImportApplicationStep } from "@/src/components/applications/create/import-application-step";
import { ImportErrorState } from "@/src/components/applications/create/import-error-state";
import { ImportLoadingState } from "@/src/components/applications/create/import-loading-state";
import { ReviewApplicationStep } from "@/src/components/applications/create/review-application-step";
import { createApplication } from "@/src/server/actions/applications/create-application";
import {
  validateApplication,
  validateImportInput,
} from "@/src/lib/validations/application";
import type {
  AddApplicationStep,
  ApplicationCreationStatus,
  ApplicationFieldErrors,
  ApplicationFormData,
  ApplicationImportMethod,
  DuplicateApplicationReason,
  DuplicateApplicationSummary,
} from "@/src/types/application";

type AddApplicationDialogContextValue = {
  openAddApplicationDialog: () => void;
};

const AddApplicationDialogContext =
  createContext<AddApplicationDialogContextValue | null>(null);

export function useAddApplicationDialog(): AddApplicationDialogContextValue {
  const context = useContext(AddApplicationDialogContext);

  if (!context) {
    throw new Error(
      "useAddApplicationDialog must be used within AddApplicationDialog.",
    );
  }

  return context;
}

function cloneEmptyApplication(): ApplicationFormData {
  return { ...EMPTY_APPLICATION, requiredSkills: [] };
}

function cloneMockApplication(): ApplicationFormData {
  return {
    ...MOCK_EXTRACTED_APPLICATION,
    requiredSkills: [...MOCK_EXTRACTED_APPLICATION.requiredSkills],
  };
}

type AddApplicationDialogProps = PropsWithChildren<{
  demoMode?: boolean;
}>;

export function AddApplicationDialog({
  children,
  demoMode = false,
}: AddApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<AddApplicationStep>("import");
  const [importMethod, setImportMethod] =
    useState<ApplicationImportMethod>("description");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [importError, setImportError] = useState<string>();
  const [application, setApplication] = useState<ApplicationFormData>(
    cloneEmptyApplication,
  );
  const [fieldErrors, setFieldErrors] = useState<ApplicationFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [duplicateMatch, setDuplicateMatch] = useState<{
    duplicateReason: DuplicateApplicationReason;
    duplicate: DuplicateApplicationSummary;
  }>();
  const [wasAnalyzed, setWasAnalyzed] = useState(false);
  const [savedStatus, setSavedStatus] =
    useState<ApplicationCreationStatus>("Wishlist");
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const submittingRef = useRef(false);
  const sessionRef = useRef(0);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  function resetDialog() {
    setStep("import");
    setImportMethod("description");
    setDescriptionInput("");
    setUrlInput("");
    setImportError(undefined);
    setApplication(cloneEmptyApplication());
    setFieldErrors({});
    setFormError(undefined);
    setDuplicateMatch(undefined);
    setWasAnalyzed(false);
    setSavedStatus("Wishlist");
    submittingRef.current = false;
  }

  function openAddApplicationDialog() {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOpen(true);
  }

  function closeDialog() {
    sessionRef.current += 1;
    clearTimers();
    setOpen(false);
    resetDialog();

    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      closeDialog();
    }
  }

  function handleMethodChange(method: ApplicationImportMethod) {
    setImportMethod(method);
    setImportError(undefined);
  }

  function handleDescriptionChange(value: string) {
    setDescriptionInput(value);
    setImportError(undefined);
  }

  function handleUrlChange(value: string) {
    setUrlInput(value);
    setImportError(undefined);
  }

  function handleAnalyze() {
    const input =
      importMethod === "description" ? descriptionInput : urlInput;
    const validationError = validateImportInput(importMethod, input);

    if (validationError) {
      setImportError(validationError);
      return;
    }

    setImportError(undefined);
    setStep("loading");

    const timer = window.setTimeout(() => {
      if (input.toLowerCase().includes(MOCK_IMPORT_ERROR_TOKEN)) {
        setStep("error");
        return;
      }

      const extractedApplication = cloneMockApplication();
      if (importMethod === "url") {
        extractedApplication.applicationUrl = urlInput.trim();
      }

      setApplication(extractedApplication);
      setWasAnalyzed(true);
      setStep("review");
    }, 1200);
    timersRef.current.push(timer);
  }

  function handleManualEntry() {
    setApplication(cloneEmptyApplication());
    setFieldErrors({});
    setFormError(undefined);
    setWasAnalyzed(false);
    setStep("review");
  }

  function handleApplicationChange<Field extends keyof ApplicationFormData>(
    field: Field,
    value: ApplicationFormData[Field],
  ) {
    setApplication((currentApplication) => ({
      ...currentApplication,
      [field]: value,
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
    setFormError(undefined);
  }

  function submitAuthenticatedApplication(
    applicationToSave: ApplicationFormData,
    forceCreate = false,
  ) {
    const session = sessionRef.current;
    submittingRef.current = true;
    setStep("saving");

    startTransition(async () => {
      try {
        const result = await createApplication(applicationToSave, {
          forceCreate,
        });
        submittingRef.current = false;

        if (session !== sessionRef.current) {
          if (result.success) router.refresh();
          return;
        }

        if (!result.success) {
          if (result.reason === "duplicate") {
            setDuplicateMatch({
              duplicateReason: result.duplicateReason,
              duplicate: result.duplicate,
            });
            setStep("duplicate");
            return;
          }

          const nextFieldErrors: ApplicationFieldErrors = {};
          const fields = Object.keys(applicationToSave) as Array<
            keyof ApplicationFormData
          >;

          fields.forEach((field) => {
            const message = result.fieldErrors?.[field]?.[0];
            if (message) nextFieldErrors[field] = message;
          });

          setFieldErrors(nextFieldErrors);
          setFormError(result.formError);
          setStep("review");
          return;
        }

        router.refresh();
        setStep("success");
        const closeTimer = window.setTimeout(closeDialog, 900);
        timersRef.current.push(closeTimer);
      } catch {
        submittingRef.current = false;
        if (session !== sessionRef.current) return;
        setFormError("We couldn’t save this application. Please try again.");
        setStep("review");
      }
    });
  }

  function handleSave(status: ApplicationCreationStatus) {
    if (submittingRef.current || isPending) return;

    const applicationToSave = { ...application, status };
    const errors = validateApplication(applicationToSave);

    if (Object.keys(errors).length > 0) {
      setApplication(applicationToSave);
      setFieldErrors(errors);
      return;
    }

    setApplication(applicationToSave);
    setFieldErrors({});
    setFormError(undefined);
    setDuplicateMatch(undefined);
    setSavedStatus(status);

    if (demoMode) {
      setStep("saving");
      submittingRef.current = true;
      const saveTimer = window.setTimeout(() => {
        submittingRef.current = false;
        setStep("success");
        const closeTimer = window.setTimeout(closeDialog, 900);
        timersRef.current.push(closeTimer);
      }, 650);
      timersRef.current.push(saveTimer);
      return;
    }

    submitAuthenticatedApplication(applicationToSave);
  }

  function handleAddAnyway() {
    if (submittingRef.current || isPending) return;

    setDuplicateMatch(undefined);
    submitAuthenticatedApplication(application, true);
  }

  return (
    <AddApplicationDialogContext.Provider value={{ openAddApplicationDialog }}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="grid h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-lg sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-4xl">
          {step === "import" ? (
            <ImportApplicationStep
              method={importMethod}
              description={descriptionInput}
              url={urlInput}
              error={importError}
              onMethodChange={handleMethodChange}
              onDescriptionChange={handleDescriptionChange}
              onUrlChange={handleUrlChange}
              onAnalyze={handleAnalyze}
              onManualEntry={handleManualEntry}
              onCancel={closeDialog}
            />
          ) : null}

          {step === "loading" ? <ImportLoadingState /> : null}

          {step === "error" ? (
            <ImportErrorState
              onRetry={() => setStep("import")}
              onManualEntry={handleManualEntry}
              onCancel={closeDialog}
            />
          ) : null}

          {step === "duplicate" && duplicateMatch ? (
            <DuplicateApplicationState
              duplicate={duplicateMatch.duplicate}
              duplicateReason={duplicateMatch.duplicateReason}
              onAddAnyway={handleAddAnyway}
              onCancel={closeDialog}
              onViewExisting={closeDialog}
            />
          ) : null}

          {step === "review" ? (
            <ReviewApplicationStep
              application={application}
              errors={fieldErrors}
              formError={formError}
              wasAnalyzed={wasAnalyzed}
              onChange={handleApplicationChange}
              onBack={() => setStep("import")}
              onCancel={closeDialog}
              onSave={handleSave}
            />
          ) : null}

          {step === "saving" || step === "success" ? (
            <>
              <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 sm:px-6">
                <DialogTitle className="text-lg text-slate-950">
                  {step === "saving" ? "Saving Application" : "Application Saved"}
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  {step === "saving"
                    ? demoMode
                      ? "Finishing your mock application draft."
                      : "Saving your application securely."
                    : demoMode
                      ? "This preview does not persist data."
                      : "Your application is now available in CareerPilot."}
                </DialogDescription>
              </DialogHeader>
              <div
                className="flex min-h-72 items-center justify-center px-6 py-10 text-center"
                role="status"
                aria-live="polite"
              >
                <div>
                  <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {step === "saving" ? (
                      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Check className="size-5" aria-hidden="true" />
                    )}
                  </span>
                  <p className="mt-4 text-base font-medium text-slate-950">
                    {step === "saving"
                      ? "Saving application…"
                      : savedStatus === "Wishlist"
                        ? "Application saved to Wishlist."
                        : "Application saved as Applied."}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {step === "saving"
                      ? "Please wait a moment."
                      : demoMode
                        ? "Demo application created locally. Changes are not stored."
                        : "Saved to your applications."}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AddApplicationDialogContext.Provider>
  );
}
