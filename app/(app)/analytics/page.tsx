import { BarChart3 } from "lucide-react";

import { FeaturePlaceholder } from "@/src/components/shared/feature-placeholder";

export default function AnalyticsPage() {
  return (
    <FeaturePlaceholder
      title="Analytics"
      description="Understand your application performance and job-search funnel."
      message="Core application metrics are available on the dashboard. Advanced historical analytics and trends are planned."
      icon={BarChart3}
    />
  );
}
