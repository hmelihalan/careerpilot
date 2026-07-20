import { FileText } from "lucide-react";


import { FeaturePlaceholder } from "@/src/components/shared/feature-placeholder";

export default function ResumesPage() {
  return (
    <FeaturePlaceholder
        title="Resumes"
        description="Manage tailored resume versions for your job applications."
        message="Resume management will be added after the core application data layer is connected."
      icon={FileText}
    />
  );
}
