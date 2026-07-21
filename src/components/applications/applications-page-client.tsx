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
import type { ApplicationListItem } from "@/src/types/application";

function countActiveFilters(filters: ApplicationsFilters): number {
  return [
    filters.status !== "All",
    filters.workMode !== "All",
    filters.location !== "All",
    filters.minimumMatchScore > 0,
  ].filter(Boolean).length;
}

type ApplicationsPageClientProps =
  | {
      mode?: "authenticated";
      applications: readonly ApplicationListItem[];
    }
  | {
      mode: "demo";
      applications?: never;
    };

export function ApplicationsPageClient(props: ApplicationsPageClientProps) {
  const mode = props.mode ?? "authenticated";
  const applications =
    props.mode === "demo" ? mockApplications : props.applications;
  const applicationsPath = appRoutes[mode].applications;
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<ApplicationsView>("board");
  const [filters, setFilters] = useState<ApplicationsFilters>(
    EMPTY_APPLICATION_FILTERS,
  );

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const activeFilterCount = countActiveFilters(filters);
  const locations = useMemo(
    () =>
      Array.from(new Set(applications.map((application) => application.location))).sort(
        (firstLocation, secondLocation) =>
          firstLocation.localeCompare(secondLocation),
      ),
    [applications],
  );
  const filteredApplications = useMemo(
    () =>
      applications.filter((application) => {
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
        const matchesScore =
          filters.minimumMatchScore === 0 ||
          (application.matchScore !== null &&
            application.matchScore >= filters.minimumMatchScore);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesWorkMode &&
          matchesLocation &&
          matchesScore
        );
      }),
    [applications, filters, normalizedSearchQuery],
  );

  const isFiltered = Boolean(normalizedSearchQuery) || activeFilterCount > 0;

  function clearFilters() {
    setSearchQuery("");
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
            {filteredApplications.length === applications.length
              ? `${applications.length} total`
              : `${filteredApplications.length} of ${applications.length}`}
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

      {applications.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <h2 className="text-sm font-medium text-slate-900">
            No applications yet
          </h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
            Use Add Application to create your first tracked opportunity.
          </p>
        </div>
      ) : view === "board" ? (
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
