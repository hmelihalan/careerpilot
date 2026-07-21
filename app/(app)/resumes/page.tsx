import { FileText } from "lucide-react";

import { FeaturePlaceholder } from "@/src/components/shared/feature-placeholder";

export default function ResumesPage() {
  return (
    <FeaturePlaceholder
      title="Resumes"
      description="Manage tailored resume versions for your job applications."
      message="Upload and manage resumes, then connect them to job applications. Resume storage and parsing are the next planned module."
      icon={FileText}
    />
  );
}
