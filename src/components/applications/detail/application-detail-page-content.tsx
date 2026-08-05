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
import { ApplicationMaterialsPanel } from "@/src/components/applications/detail/application-materials-panel";
import { ApplicationResumeMatchWorkspace } from "@/src/components/applications/detail/application-resume-match-workspace";
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
import type { ResumeListItem } from "@/src/types/resume-builder";

type ApplicationDetailPageContentProps =
  | {
      application: ApplicationDetailViewModel;
      resumes: readonly ResumeListItem[];
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
      { id: "notes", label: "Notes", content: <ApplicationNotes demo /> },
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
        id: "follow-up",
        label: "Follow-up",
        content: (
          <UnavailableFeaturePanel
            title="Follow-up Message"
            message="Sign in to generate a message from a saved resume and job listing."
          />
        ),
      },
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
    const { application, resumes } = props;
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
        content: (
          <ApplicationNotes
            slug={application.slug}
            notes={application.notes}
            reminders={application.reminders}
          />
        ),
      },
      {
        id: "resume-match",
        label: "Resume Match",
        content: (
          <ApplicationResumeMatchWorkspace
            key={application.resumeMatches[0]?.id ?? "empty-resume-match"}
            slug={application.slug}
            company={application.company}
            role={application.role}
            hasJobDescription={Boolean(application.jobDescription)}
            resumes={resumes}
            matches={application.resumeMatches}
            submittedResume={application.submittedResume}
          />
        ),
      },
      {
        id: "cover-letter",
        label: "Cover Letter",
        content: (
          <ApplicationMaterialsPanel
            key={`cover-letter-${application.material?.updatedAt ?? "empty"}`}
            kind="coverLetter"
            slug={application.slug}
            company={application.company}
            role={application.role}
            hasJobDescription={Boolean(application.jobDescription)}
            resumes={resumes}
            material={application.material}
          />
        ),
      },
      {
        id: "follow-up",
        label: "Follow-up",
        content: (
          <ApplicationMaterialsPanel
            key={`follow-up-${application.material?.updatedAt ?? "empty"}`}
            kind="followUpMessage"
            slug={application.slug}
            company={application.company}
            role={application.role}
            hasJobDescription={Boolean(application.jobDescription)}
            resumes={resumes}
            material={application.material}
          />
        ),
      },
      {
        id: "interview-prep",
        label: "Interview Prep",
        content: (
          <ApplicationMaterialsPanel
            key={`interview-${application.material?.updatedAt ?? "empty"}`}
            kind="interviewQuestions"
            slug={application.slug}
            company={application.company}
            role={application.role}
            hasJobDescription={Boolean(application.jobDescription)}
            resumes={resumes}
            material={application.material}
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
