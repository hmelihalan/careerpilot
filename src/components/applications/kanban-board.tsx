import { KanbanColumn } from "@/src/components/applications/kanban-column";
import type { ApplicationListItem, ApplicationStatus } from "@/src/types/application";

type KanbanStage = {
  title: ApplicationStatus;
  applications: readonly ApplicationListItem[];
};

const stageTitles = [
  "Wishlist",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
] as const satisfies readonly ApplicationStatus[];

type KanbanBoardProps = {
  applications: readonly ApplicationListItem[];
  applicationsPath: string;
  isFiltered: boolean;
};

export function KanbanBoard({
  applications,
  applicationsPath,
  isFiltered,
}: KanbanBoardProps) {
  const stages: readonly KanbanStage[] = stageTitles.map((title) => ({
    title,
    applications: applications.filter(
      (application) => application.status === title,
    ),
  }));

  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      aria-label="Applications kanban board"
    >
      {stages.map((stage) => (
        <KanbanColumn
          key={stage.title}
          title={stage.title}
          applications={stage.applications}
          applicationsPath={applicationsPath}
          showFilteredEmptyState={isFiltered}
        />
      ))}
    </div>
  );
}
