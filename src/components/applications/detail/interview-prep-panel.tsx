import { ChevronDown, MessageSquareText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuestionCategory = "Technical" | "Behavioral" | "Company-Specific";
type QuestionDifficulty = "Easy" | "Medium" | "Hard";

type InterviewQuestion = {
  question: string;
  difficulty: QuestionDifficulty;
};

type QuestionGroup = {
  category: QuestionCategory;
  questions: readonly InterviewQuestion[];
};

const questionGroups: readonly QuestionGroup[] = [
  {
    category: "Technical",
    questions: [
      { question: "How would you structure a reusable React component system?", difficulty: "Medium" },
      { question: "How does server-side rendering work in Next.js?", difficulty: "Medium" },
      { question: "How would you design an API for tracking job applications?", difficulty: "Hard" },
      { question: "How would you improve the performance of a PostgreSQL query?", difficulty: "Hard" },
    ],
  },
  {
    category: "Behavioral",
    questions: [
      { question: "Tell us about a difficult technical problem you solved.", difficulty: "Medium" },
      { question: "Describe a time you received critical feedback.", difficulty: "Medium" },
      { question: "How do you prioritize tasks under a deadline?", difficulty: "Easy" },
    ],
  },
  {
    category: "Company-Specific",
    questions: [
      { question: "Why are you interested in Kron?", difficulty: "Easy" },
      { question: "What interests you about working on enterprise software?", difficulty: "Medium" },
      { question: "How would you contribute as an intern?", difficulty: "Medium" },
    ],
  },
];

const categoryStyles: Record<QuestionCategory, string> = {
  Technical: "bg-indigo-50 text-indigo-700",
  Behavioral: "bg-sky-50 text-sky-700",
  "Company-Specific": "bg-violet-50 text-violet-700",
};

const difficultyStyles: Record<QuestionDifficulty, string> = {
  Easy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Hard: "border-rose-200 bg-rose-50 text-rose-700",
};

type InterviewPrepPanelProps = {
  role: string;
  company: string;
};

export function InterviewPrepPanel({ role, company }: InterviewPrepPanelProps) {
  return (
    <Card size="sm" className="border border-slate-200 bg-white shadow-none ring-0">
      <CardHeader className="gap-3 border-b border-slate-100 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <MessageSquareText className="size-4" aria-hidden="true" />
            </span>
            <CardTitle>Interview Prep</CardTitle>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Practice questions tailored to the {role} role at {company}.
          </p>
        </div>
        <Button size="sm" className="w-fit rounded-lg">
          <Sparkles data-icon="inline-start" aria-hidden="true" />
          Generate More Questions
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {questionGroups.map((group) => (
          <section key={group.category} aria-labelledby={`questions-${group.category}`}>
            <h3
              id={`questions-${group.category}`}
              className="text-sm font-medium text-slate-900"
            >
              {group.category} Questions
            </h3>
            <div className="mt-2.5 grid gap-3 md:grid-cols-2">
              {group.questions.map((question) => (
                <article
                  key={question.question}
                  className="flex min-h-36 flex-col rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "rounded-md px-2 text-[10px] font-medium",
                        categoryStyles[group.category],
                      )}
                    >
                      {group.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md px-2 text-[10px] font-medium",
                        difficultyStyles[question.difficulty],
                      )}
                    >
                      {question.difficulty}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-5 text-slate-900">
                    {question.question}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-auto w-fit rounded-lg px-0 pt-3 text-indigo-600 hover:bg-transparent hover:text-indigo-700"
                  >
                    Show Guidance
                    <ChevronDown data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </article>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
