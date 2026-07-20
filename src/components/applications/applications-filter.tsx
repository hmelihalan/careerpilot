import { useState } from "react";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ApplicationStatus,
  ApplicationWorkMode,
} from "@/src/types/application";

export type ApplicationsFilters = {
  status: ApplicationStatus | "All";
  workMode: ApplicationWorkMode | "All";
  location: string;
  minimumMatchScore: 0 | 70 | 80 | 90;
};

export const EMPTY_APPLICATION_FILTERS: ApplicationsFilters = {
  status: "All",
  workMode: "All",
  location: "All",
  minimumMatchScore: 0,
};

const statusOptions = [
  "All",
  "Wishlist",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
] as const satisfies readonly ApplicationsFilters["status"][];

const workModeOptions = [
  "All",
  "Remote",
  "Hybrid",
  "On-site",
] as const satisfies readonly ApplicationsFilters["workMode"][];

const matchScoreOptions = [
  { value: "0", label: "Any score" },
  { value: "70", label: "70% and above" },
  { value: "80", label: "80% and above" },
  { value: "90", label: "90% and above" },
] as const;

type ApplicationsFilterProps = {
  filters: ApplicationsFilters;
  activeFilterCount: number;
  locations: readonly string[];
  onApply: (filters: ApplicationsFilters) => void;
  onClear: () => void;
};

export function ApplicationsFilter({
  filters,
  activeFilterCount,
  locations,
  onApply,
  onClear,
}: ApplicationsFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);

  function toggleOpen() {
    setOpen((currentOpen) => {
      if (!currentOpen) setDraftFilters(filters);
      return !currentOpen;
    });
  }

  function clearFilters() {
    setDraftFilters(EMPTY_APPLICATION_FILTERS);
    onClear();
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-lg"
        aria-expanded={open}
        aria-controls="application-filter-panel"
        onClick={toggleOpen}
      >
        <Filter data-icon="inline-start" aria-hidden="true" />
        Filter
        {activeFilterCount > 0 ? (
          <span
            className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-semibold text-white"
            aria-label={`${activeFilterCount} active filters`}
          >
            {activeFilterCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          id="application-filter-panel"
          className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-md"
          role="region"
          aria-label="Application filters"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="filter-status" className="text-xs text-slate-700">
                Status
              </Label>
              <Select
                value={draftFilters.status}
                onValueChange={(value) => {
                  if (value && statusOptions.includes(value as ApplicationsFilters["status"])) {
                    setDraftFilters((current) => ({
                      ...current,
                      status: value as ApplicationsFilters["status"],
                    }));
                  }
                }}
              >
                <SelectTrigger id="filter-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-work-mode" className="text-xs text-slate-700">
                Work Mode
              </Label>
              <Select
                value={draftFilters.workMode}
                onValueChange={(value) => {
                  if (value && workModeOptions.includes(value as ApplicationsFilters["workMode"])) {
                    setDraftFilters((current) => ({
                      ...current,
                      workMode: value as ApplicationsFilters["workMode"],
                    }));
                  }
                }}
              >
                <SelectTrigger id="filter-work-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workModeOptions.map((workMode) => (
                    <SelectItem key={workMode} value={workMode}>
                      {workMode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-location" className="text-xs text-slate-700">
                Location
              </Label>
              <Select
                value={draftFilters.location}
                onValueChange={(value) => {
                  if (value) {
                    setDraftFilters((current) => ({ ...current, location: value }));
                  }
                }}
              >
                <SelectTrigger id="filter-location" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-match-score" className="text-xs text-slate-700">
                Match Score
              </Label>
              <Select
                value={String(draftFilters.minimumMatchScore)}
                onValueChange={(value) => {
                  const score = Number(value);
                  if (score === 0 || score === 70 || score === 80 || score === 90) {
                    setDraftFilters((current) => ({
                      ...current,
                      minimumMatchScore: score,
                    }));
                  }
                }}
              >
                <SelectTrigger id="filter-match-score" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {matchScoreOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(draftFilters);
                setOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
