import { Sparkles } from "lucide-react";


import { FeaturePlaceholder } from "@/src/components/shared/feature-placeholder";

export default function AiStudioPage() {
  return (
    <FeaturePlaceholder
        title="AI Studio"
        description="Generate tailored career content and analyze job compatibility."
        message="AI tools will be connected after applications and resumes use real data."
      icon={Sparkles}
    />
  );
}
