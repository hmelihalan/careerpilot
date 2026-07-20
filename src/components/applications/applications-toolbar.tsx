import { LayoutGrid, List, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ApplicationsFilter,
  type ApplicationsFilters,
} from "@/src/components/applications/applications-filter";

export type ApplicationsView = "board" | "list";

type ApplicationsToolbarProps = {
  searchQuery: string;
  view: ApplicationsView;
  filters: ApplicationsFilters;
  activeFilterCount: number;
  locations: readonly string[];
  onSearchChange: (query: string) => void;
  onViewChange: (view: ApplicationsView) => void;
  onApplyFilters: (filters: ApplicationsFilters) => void;
  onClearFilters: () => void;
};

export function ApplicationsToolbar({
  searchQuery,
  view,
  filters,
  activeFilterCount,
  locations,
  onSearchChange,
  onViewChange,
  onApplyFilters,
  onClearFilters,
}: ApplicationsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-72">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search applications"
          placeholder="Search applications..."
          className="h-8 rounded-lg border-slate-200 bg-slate-50 pl-8 text-sm shadow-none focus-visible:bg-white"
        />
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <ApplicationsFilter
          filters={filters}
          activeFilterCount={activeFilterCount}
          locations={locations}
          onApply={onApplyFilters}
          onClear={onClearFilters}
        />
        <div
          className="flex items-center rounded-lg border border-slate-200 p-0.5"
          role="group"
          aria-label="Application view"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Board view"
            aria-pressed={view === "board"}
            onClick={() => onViewChange("board")}
            className={cn(
              "rounded-md text-slate-500",
              view === "board" &&
                "bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100 hover:bg-indigo-50 hover:text-indigo-700",
            )}
          >
            <LayoutGrid aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => onViewChange("list")}
            className={cn(
              "rounded-md text-slate-500",
              view === "list" &&
                "bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100 hover:bg-indigo-50 hover:text-indigo-700",
            )}
          >
            <List aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
