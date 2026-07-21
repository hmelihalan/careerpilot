import { Suspense, type ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/src/components/applications/detail/activity-timeline";
import { ApplicationDeleteDialog } from "@/src/components/applications/detail/application-delete-dialog";
import { ApplicationEditDialog } from "@/src/components/applications/detail/application-edit-dialog";
import type { ApplicationHeaderData } from "@/src/components/applications/detail/application-detail-header";
import { ApplicationDetailHeader } from "@/src/components/applications/detail/application-detail-header";
import { ApplicationStatusControl } from "@/src/components/applications/detail/application-status-control";
import type { ApplicationDetailTab } from "@/src/components/applications/detail/application-detail-tabs";
import { ApplicationDetailTabs } from "@/src/components/applications/detail/application-detail-tabs";
import { ApplicationNotes } from "@/src/components/applications/detail/application-notes";
import { ApplicationOverview } from "@/src/components/applications/detail/application-overview";
import { CoverLetterPanel } from "@/src/components/applications/detail/cover-letter-panel";
import { InterviewPrepPanel } from "@/src/components/applications/detail/interview-prep-panel";
import { JobDescriptionPanel } from "@/src/components/applications/detail/job-description-panel";
import { ResumeMatchPanel } from "@/src/components/applications/detail/resume-match-panel";
import { DemoModeNotice } from "@/src/components/shared/demo-mode-notice";
import { appRoutes } from "@/src/constants/navigation";
import type {
  ApplicationDetailViewModel,
  MockApplication,
} from "@/src/types/application";

type ApplicationDetailPageContentProps =
  | {
      application: ApplicationDetailViewModel;
      mode?: "authenticated";
    }
  | {
      application: MockApplication;
      mode: "demo";
    };

type UnavailableFeaturePanelProps = {
  title: string;
  message: string;
};

function formatDetailDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function UnavailableFeaturePanel({
  title,
  message,
}: UnavailableFeaturePanelProps) {
  return (
    <Card size="sm" className="border border-slate-200 bg-white shadow-none ring-0">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
          <CardTitle className="text-slate-950">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <p className="text-sm text-slate-500">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApplicationDetailPageContent(
  props: ApplicationDetailPageContentProps,
) {
  let applicationsPath: string;
  let deleteControl: ReactNode;
  let demoMode: boolean;
  let editControl: ReactNode;
  let headerApplication: ApplicationHeaderData;
  let statusControl: ReactNode;
  let tabs: readonly ApplicationDetailTab[];

  if (props.mode === "demo") {
    const { application } = props;
    applicationsPath = appRoutes.demo.applications;
    demoMode = true;
    headerApplication = {
      initials: application.initials,
      role: application.role,
      company: application.company,
      status: application.status,
      match: application.matchScore,
      location: application.location,
      workMode: application.workMode,
      dateLabel: `Applied ${application.appliedAgo}`,
    };
    tabs = [
      {
        id: "overview",
        label: "Overview",
        content: (
          <ApplicationOverview
            details={{
              location: application.location,
              workMode: application.workMode,
              employmentType: application.employmentType,
              applicationDate: application.appliedDate,
              deadline: application.deadline,
              source: application.source,
              salary: "Not specified",
              applicationUrl: application.applicationUrl,
              summary: application.description,
              skills: application.skills,
            }}
          />
        ),
      },
      {
        id: "job-description",
        label: "Job Description",
        content: (
          <JobDescriptionPanel
            role={application.role}
            company={application.company}
            description={application.description}
          />
        ),
      },
      { id: "notes", label: "Notes", content: <ApplicationNotes /> },
      {
        id: "resume-match",
        label: "Resume Match",
        content: (
          <ResumeMatchPanel
            company={application.company}
            matchScore={application.matchScore}
            skills={application.skills}
          />
        ),
      },
      { id: "cover-letter", label: "Cover Letter", content: <CoverLetterPanel /> },
      {
        id: "interview-prep",
        label: "Interview Prep",
        content: (
          <InterviewPrepPanel
            role={application.role}
            company={application.company}
          />
        ),
      },
      { id: "activity", label: "Activity", content: <ActivityTimeline /> },
    ];
  } else {
    const { application } = props;
    const appliedAt = application.dates.appliedAt;
    applicationsPath = appRoutes.authenticated.applications;
    demoMode = false;
    headerApplication = {
      initials: application.initials,
      role: application.role,
      company: application.company,
      status: application.status,
      location: application.location ?? "Not available",
      workMode: application.workMode ?? "Not available",
      dateLabel: appliedAt
        ? `Applied ${formatDetailDate(appliedAt)}`
        : `Created ${formatDetailDate(application.createdAt)}`,
    };
    tabs = [
      {
        id: "overview",
        label: "Overview",
        content: (
          <ApplicationOverview
            showMockHighlights={false}
            details={{
              location: application.location ?? "Not available",
              workMode: application.workMode ?? "Not available",
              employmentType: application.employmentType ?? "Not available",
              applicationDate: appliedAt
                ? formatDetailDate(appliedAt)
                : "Not available",
              deadline: application.dates.deadline
                ? formatDetailDate(application.dates.deadline)
                : "Not available",
              source: application.source ?? "Not available",
              salary: application.salary ?? "Not specified",
              applicationUrl: application.applicationUrl,
              summary: application.jobDescription,
              skills: application.skills,
              createdAt: formatDetailDate(application.createdAt),
              updatedAt: formatDetailDate(application.updatedAt),
            }}
          />
        ),
      },
      {
        id: "job-description",
        label: "Job Description",
        content: (
          <JobDescriptionPanel
            role={application.role}
            company={application.company}
            description={application.jobDescription}
            showMockSections={false}
          />
        ),
      },
      {
        id: "notes",
        label: "Notes",
        content: <ApplicationNotes notes={application.notes} readOnly />,
      },
      {
        id: "resume-match",
        label: "Resume Match",
        content: (
          <UnavailableFeaturePanel
            title="Resume Match"
            message="AI analysis has not been generated yet."
          />
        ),
      },
      {
        id: "cover-letter",
        label: "Cover Letter",
        content: (
          <UnavailableFeaturePanel
            title="Cover Letter"
            message="No cover letter has been generated yet."
          />
        ),
      },
      {
        id: "interview-prep",
        label: "Interview Prep",
        content: (
          <UnavailableFeaturePanel
            title="Interview Prep"
            message="AI analysis has not been generated yet."
          />
        ),
      },
      {
        id: "activity",
        label: "Activity",
        content: <ActivityTimeline history={application.statusHistory} />,
      },
    ];
    deleteControl = (
      <ApplicationDeleteDialog
        slug={application.slug}
        company={application.company}
        role={application.role}
      />
    );
    editControl = (
      <ApplicationEditDialog
        slug={application.slug}
        initialValues={application.editValues}
      />
    );
    statusControl = (
      <ApplicationStatusControl
        slug={application.slug}
        currentStatus={application.statusValue}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {demoMode ? <DemoModeNotice /> : null}

      <ApplicationDetailHeader
        applicationsPath={applicationsPath}
        demoMode={demoMode}
        application={headerApplication}
        deleteControl={deleteControl}
        editControl={editControl}
        statusControl={statusControl}
      />
      <Suspense
        fallback={
          <div
            className="h-10 border-b border-slate-200"
            aria-label="Loading application tabs"
          />
        }
      >
        <ApplicationDetailTabs tabs={tabs} />
      </Suspense>
    </div>
  );
}
