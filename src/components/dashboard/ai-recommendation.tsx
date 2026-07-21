import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AiRecommendationProps = {
  applicationsPath: string;
  unavailable?: boolean;
};

export function AiRecommendation({
  applicationsPath,
  unavailable = false,
}: AiRecommendationProps) {
  return (
    <Card size="sm" className="h-full border border-indigo-100 bg-indigo-50/60 shadow-none ring-0">
      <CardHeader>
        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Sparkles className="size-3.5" aria-hidden="true" />
        </div>
        <CardTitle className="mt-2">AI Recommendation</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {unavailable ? (
          <p className="text-xs leading-5 text-slate-600">
            AI recommendations have not been generated yet.
          </p>
        ) : (
          <>
            <p className="text-xs leading-5 text-slate-600">
              Adding PostgreSQL and automated testing experience to your primary resume may
              improve 5 active job matches.
            </p>
            <Link
              href={`${applicationsPath}/kron-full-stack-intern?tab=resume-match`}
              className="mt-4 inline-flex h-7 w-fit items-center justify-center rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Review Suggestions
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
