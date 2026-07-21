import { Sparkles } from "lucide-react";

import { FeaturePlaceholder } from "@/src/components/shared/feature-placeholder";

export default function AiStudioPage() {
  return (
    <FeaturePlaceholder
      title="AI Studio"
      description="Generate tailored career content and analyze job compatibility."
      message="AI-assisted resume matching, cover letters, and interview preparation will be added after the Resume module."
      icon={Sparkles}
    />
  );
}
