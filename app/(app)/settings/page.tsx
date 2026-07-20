import { Settings } from "lucide-react";


import { FeaturePlaceholder } from "@/src/components/shared/feature-placeholder";

export default function SettingsPage() {
  return (
    <FeaturePlaceholder
        title="Settings"
        description="Manage your CareerPilot preferences and account settings."
        message="Account and application preferences will be added after authentication is configured."
      icon={Settings}
    />
  );
}
