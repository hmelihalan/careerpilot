import { ApplicationDetailPageContent } from "@/src/components/applications/detail/application-detail-page-content";
import { getApplicationDetailForCurrentUser } from "@/src/server/applications/get-application-detail";

type ApplicationDetailPageProps = {
  params: Promise<{ applicationId: string }>;
};

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { applicationId } = await params;
  const application = await getApplicationDetailForCurrentUser(applicationId);

  return <ApplicationDetailPageContent application={application} />;
}
