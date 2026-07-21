import { DashboardPageContent } from "@/src/components/dashboard/dashboard-page-content";
import { getDashboardDataForCurrentUser } from "@/src/server/dashboard/get-dashboard-data";

export default async function DashboardPage() {
  const dashboard = await getDashboardDataForCurrentUser();

  return <DashboardPageContent dashboard={dashboard} />;
}
