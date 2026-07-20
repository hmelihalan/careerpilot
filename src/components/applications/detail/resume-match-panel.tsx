import { ArrowUpRight, Check, FileText, Sparkles, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";


const weakSkills = ["Docker", "Automated testing", "PostgreSQL optimization"] as const;
const suggestions = [
  "Add a testing project using Vitest or Jest",
  "Describe PostgreSQL experience with measurable outcomes",
  "Mention Docker usage in a project deployment",
] as const;

type ResumeMatchPanelProps = {
  company: string;
  matchScore: number;
  skills: readonly string[];
};

export function ResumeMatchPanel({
  company,
  matchScore,
  skills,
}: ResumeMatchPanelProps) {
  const matchingSkills = skills.slice(0, 5);

  return (
    <Card size="sm" className="border border-slate-200 bg-white shadow-none ring-0">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <FileText className="size-3.5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-slate-950">Resume Match</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">Compared with the {company} job description.</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-600">
                Overall match
              </p>
              <p className="mt-1 text-4xl font-medium tracking-tight text-slate-950">{matchScore}%</p>
            </div>
            <Sparkles className="size-5 text-indigo-500" aria-hidden="true" />
          </div>
          <Progress
            value={matchScore}
            aria-label={`Resume match score: ${matchScore} percent`}
            className="mt-3 **:data-[slot=progress-track]:h-1.5 **:data-[slot=progress-track]:bg-indigo-100 **:data-[slot=progress-indicator]:bg-indigo-600"
          />
          <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-600">
            Your resume is a strong match for this role, with clear alignment across the core
            frontend stack and API fundamentals. Adding evidence for infrastructure, testing, and
            database performance would make your application more competitive.
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section aria-labelledby="matching-skills">
            <div className="flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
              <h3 id="matching-skills" className="text-xs font-medium text-slate-950">
                Matching skills
              </h3>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {matchingSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="rounded-md border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </section>

          <section aria-labelledby="weak-skills">
            <div className="flex items-center gap-1.5">
              <TriangleAlert className="size-3.5 text-amber-600" aria-hidden="true" />
              <h3 id="weak-skills" className="text-xs font-medium text-slate-950">
                Missing or weak skills
              </h3>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {weakSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="rounded-md border-amber-200 bg-amber-50 text-[11px] text-amber-700"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 border-t border-slate-100 pt-4" aria-labelledby="suggestions">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-indigo-600" aria-hidden="true" />
            <h3 id="suggestions" className="text-xs font-medium text-slate-950">
              Suggestions
            </h3>
          </div>
          <ol className="mt-2.5 space-y-2">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion} className="flex gap-2.5 text-xs leading-5 text-slate-600">
                <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-medium text-indigo-700">
                  {index + 1}
                </span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
          <Button type="button" variant="outline" size="sm" className="rounded-lg border-slate-200">
            <FileText data-icon="inline-start" aria-hidden="true" />
            Review Resume
          </Button>
          <Button type="button" size="sm" className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
            <Sparkles data-icon="inline-start" aria-hidden="true" />
            Generate Improved Suggestions
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
