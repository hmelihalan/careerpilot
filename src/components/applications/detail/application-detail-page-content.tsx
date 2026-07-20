import { Suspense } from "react";

import { ApplicationDetailHeader } from "@/src/components/applications/detail/application-detail-header";
import type { ApplicationDetailTab } from "@/src/components/applications/detail/application-detail-tabs";
import { ApplicationDetailTabs } from "@/src/components/applications/detail/application-detail-tabs";
import { ApplicationNotes } from "@/src/components/applications/detail/application-notes";
import { ApplicationOverview } from "@/src/components/applications/detail/application-overview";
import { ActivityTimeline } from "@/src/components/applications/detail/activity-timeline";
import { CoverLetterPanel } from "@/src/components/applications/detail/cover-letter-panel";
import { InterviewPrepPanel } from "@/src/components/applications/detail/interview-prep-panel";
import { JobDescriptionPanel } from "@/src/components/applications/detail/job-description-panel";
import { ResumeMatchPanel } from "@/src/components/applications/detail/resume-match-panel";
import { DemoModeNotice } from "@/src/components/shared/demo-mode-notice";
import { appRoutes } from "@/src/constants/navigation";
import type { MockApplication } from "@/src/types/application";
import type { AppMode } from "@/src/types/navigation";

type ApplicationDetailPageContentProps = {
  application: MockApplication;
  mode?: AppMode;
};

export function ApplicationDetailPageContent({
  application,
  mode = "authenticated",
}: ApplicationDetailPageContentProps) {
  const applicationsPath = appRoutes[mode].applications;
  const tabs: readonly ApplicationDetailTab[] = [
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

  return (
    <div className="min-w-0 space-y-4">
      {mode === "demo" ? <DemoModeNotice /> : null}

      <ApplicationDetailHeader
        applicationsPath={applicationsPath}
        demoMode={mode === "demo"}
        application={{
          initials: application.initials,
          role: application.role,
          company: application.company,
          status: application.status,
          match: application.matchScore,
          location: application.location,
          workMode: application.workMode,
          appliedAgo: application.appliedAgo,
        }}
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
