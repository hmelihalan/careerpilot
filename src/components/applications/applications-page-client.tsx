"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  EMPTY_APPLICATION_FILTERS,
  type ApplicationsFilters,
} from "@/src/components/applications/applications-filter";
import { ApplicationsList } from "@/src/components/applications/applications-list";
import {
  ApplicationsToolbar,
  type ApplicationsView,
} from "@/src/components/applications/applications-toolbar";
import { KanbanBoard } from "@/src/components/applications/kanban-board";
import { DemoModeNotice } from "@/src/components/shared/demo-mode-notice";
import { appRoutes } from "@/src/constants/navigation";
import { mockApplications } from "@/src/constants/mock-applications";
import type { AppMode } from "@/src/types/navigation";

const locations = Array.from(
  new Set(mockApplications.map((application) => application.location)),
).sort((firstLocation, secondLocation) =>
  firstLocation.localeCompare(secondLocation),
);

function countActiveFilters(filters: ApplicationsFilters): number {
  return [
    filters.status !== "All",
    filters.workMode !== "All",
    filters.location !== "All",
    filters.minimumMatchScore > 0,
  ].filter(Boolean).length;
}

type ApplicationsPageClientProps = {
  mode?: AppMode;
};

export function ApplicationsPageClient({
  mode = "authenticated",
}: ApplicationsPageClientProps) {
  const applicationsPath = appRoutes[mode].applications;
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<ApplicationsView>("board");
  const [filters, setFilters] = useState<ApplicationsFilters>(
    EMPTY_APPLICATION_FILTERS,
  );

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const activeFilterCount = countActiveFilters(filters);
  const filteredApplications = useMemo(
    () =>
      mockApplications.filter((application) => {
        const searchableText = [
          application.role,
          application.company,
          application.location,
          application.workMode,
          application.status,
          ...application.skills,
        ]
          .join(" ")
          .toLocaleLowerCase();

        const matchesSearch =
          !normalizedSearchQuery || searchableText.includes(normalizedSearchQuery);
        const matchesStatus =
          filters.status === "All" || application.status === filters.status;
        const matchesWorkMode =
          filters.workMode === "All" || application.workMode === filters.workMode;
        const matchesLocation =
          filters.location === "All" || application.location === filters.location;
        const matchesScore = application.matchScore >= filters.minimumMatchScore;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesWorkMode &&
          matchesLocation &&
          matchesScore
        );
      }),
    [filters, normalizedSearchQuery],
  );

  const isFiltered = Boolean(normalizedSearchQuery) || activeFilterCount > 0;

  function clearFilters() {
    setFilters(EMPTY_APPLICATION_FILTERS);
  }

  return (
    <div className="min-w-0 space-y-4">
      {mode === "demo" ? <DemoModeNotice /> : null}

      <section aria-labelledby="applications-title">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1
            id="applications-title"
            className="text-xl font-medium tracking-tight text-slate-950 sm:text-2xl"
          >
            Applications
          </h1>
          <Badge
            variant="secondary"
            className="rounded-md bg-slate-200/70 px-2 font-medium text-slate-600"
            aria-live="polite"
          >
            {filteredApplications.length === mockApplications.length
              ? `${mockApplications.length} total`
              : `${filteredApplications.length} of ${mockApplications.length}`}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Track and manage all your job applications
        </p>
      </section>

      <ApplicationsToolbar
        searchQuery={searchQuery}
        view={view}
        filters={filters}
        activeFilterCount={activeFilterCount}
        locations={locations}
        onSearchChange={setSearchQuery}
        onViewChange={setView}
        onApplyFilters={setFilters}
        onClearFilters={clearFilters}
      />

      {view === "board" ? (
        <KanbanBoard
          applications={filteredApplications}
          isFiltered={isFiltered}
          applicationsPath={applicationsPath}
        />
      ) : (
        <ApplicationsList
          applications={filteredApplications}
          applicationsPath={applicationsPath}
          onClearFilters={clearFilters}
        />
      )}
    </div>
  );
}
