import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type FeaturePlaceholderProps = {
  title: string;
  description: string;
  message: string;
  icon: LucideIcon;
};

export function FeaturePlaceholder({
  title,
  description,
  message,
  icon: Icon,
}: FeaturePlaceholderProps) {
  const titleId = `${title.toLowerCase().replaceAll(" ", "-")}-title`;

  return (
    <div className="min-w-0 space-y-4">
      <section aria-labelledby={titleId}>
        <h1
          id={titleId}
          className="text-xl font-medium tracking-tight text-slate-950 sm:text-2xl"
        >
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </section>

      <Card className="border border-slate-200 shadow-none ring-0">
        <CardContent className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-sm font-medium text-slate-900">
            Coming in a later milestone
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            {message}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
