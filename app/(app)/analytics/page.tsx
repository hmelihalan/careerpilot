import { BarChart3 } from "lucide-react";


import { FeaturePlaceholder } from "@/src/components/shared/feature-placeholder";

export default function AnalyticsPage() {
  return (
    <FeaturePlaceholder
        title="Analytics"
        description="Understand your application performance and job-search funnel."
        message="Analytics will become available once application activity is stored in the database."
      icon={BarChart3}
    />
  );
}
