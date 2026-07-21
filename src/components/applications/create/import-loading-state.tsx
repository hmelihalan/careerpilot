import { Check, LoaderCircle } from "lucide-react";

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ImportApplicationMode } from "@/src/components/applications/create/import-application-step";
import type { ApplicationImportMethod } from "@/src/types/application";

const analysisSteps = [
  "Detecting company and role",
  "Extracting location and work type",
  "Identifying required skills",
] as const;

type ImportLoadingStateProps = {
  mode: ImportApplicationMode;
  method: ApplicationImportMethod;
};

export function ImportLoadingState({ mode, method }: ImportLoadingStateProps) {
  const isSimulation = mode === "simulation";
  const importLabel = method === "url" ? "job URL" : "job description";

  return (
    <>
      <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 sm:px-6">
        <DialogTitle className="text-lg text-slate-950">Add Application</DialogTitle>
        <DialogDescription className="text-slate-500">
          {isSimulation
            ? "CareerPilot is preparing a simulated review draft."
            : "Automatic analysis is coming soon."}
        </DialogDescription>
      </DialogHeader>
      <div
        className="flex min-h-80 items-center justify-center overflow-y-auto px-6 py-10"
        role="status"
        aria-live="polite"
      >
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-base font-medium text-slate-950">
            {isSimulation
              ? `Simulating ${importLabel} analysis…`
              : "Analysis unavailable"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {isSimulation
              ? "Simulated demo only. Local mock data is used and nothing is stored."
              : "Enter details manually to add this application."}
          </p>
          <ul className="mt-6 space-y-2 text-left">
            {analysisSteps.map((step) => (
              <li
                key={step}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
              >
                <Check className="size-3.5 text-indigo-500" aria-hidden="true" />
                {step}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
