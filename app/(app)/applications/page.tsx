import { ApplicationsPageClient } from "@/src/components/applications/applications-page-client";
import { getApplicationsForCurrentUser } from "@/src/server/applications/get-applications";

export default async function ApplicationsPage() {
  const applications = await getApplicationsForCurrentUser();

  return <ApplicationsPageClient applications={applications} />;
}
