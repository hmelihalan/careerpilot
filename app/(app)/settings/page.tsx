import { Settings } from "lucide-react";

import { FeaturePlaceholder } from "@/src/components/shared/feature-placeholder";

export default function SettingsPage() {
  return (
    <FeaturePlaceholder
      title="Settings"
      description="Manage your CareerPilot preferences and account settings."
      message="Account authentication is active. Career preferences and application defaults will be configurable here later."
      icon={Settings}
    />
  );
}
