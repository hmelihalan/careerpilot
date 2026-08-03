import { ApplicationDetailPageContent } from "@/src/components/applications/detail/application-detail-page-content";
import { getApplicationDetailForCurrentUser } from "@/src/server/applications/get-application-detail";
import { getResumeDraftsForCurrentUser } from "@/src/server/resume-builder/get-resume-drafts";

type ApplicationDetailPageProps = {
  params: Promise<{ applicationId: string }>;
};

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { applicationId } = await params;
  const [application, resumes] = await Promise.all([
    getApplicationDetailForCurrentUser(applicationId),
    getResumeDraftsForCurrentUser(),
  ]);

  return <ApplicationDetailPageContent application={application} resumes={resumes} />;
}
