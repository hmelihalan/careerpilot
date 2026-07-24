import { ApplicationsPageClient } from "@/src/components/applications/applications-page-client";
import { getApplicationStatusLabel } from "@/src/constants/application-status";
import { applicationsSearchParamsSchema } from "@/src/lib/validations/application-filters";
import { getApplicationsForCurrentUser } from "@/src/server/applications/get-applications";

type ApplicationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps) {
  const [applications, rawSearchParams] = await Promise.all([
    getApplicationsForCurrentUser(),
    searchParams,
  ]);
  const parsedSearchParams = applicationsSearchParamsSchema.safeParse(rawSearchParams);
  const initialStatus =
    parsedSearchParams.success && parsedSearchParams.data.status
      ? getApplicationStatusLabel(parsedSearchParams.data.status)
      : "All";

  return (
    <ApplicationsPageClient
      key={initialStatus}
      applications={applications}
      initialStatus={initialStatus}
    />
  );
}
