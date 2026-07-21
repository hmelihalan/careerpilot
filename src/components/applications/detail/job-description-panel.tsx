import { BriefcaseBusiness } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const responsibilities = [
  "Build and refine customer-facing features across the company’s web platform.",
  "Collaborate with product, design, and engineering to turn requirements into reliable solutions.",
  "Develop reusable React components and maintain type-safe APIs with TypeScript.",
  "Write clear, maintainable code and participate in code reviews with the engineering team.",
  "Investigate issues, improve performance, and contribute to technical documentation.",
] as const;

const requirements = [
  "Currently pursuing or recently completed a degree in Computer Science, Software Engineering, or a related field.",
  "Hands-on experience with TypeScript, React, and modern web development fundamentals.",
  "Understanding of REST APIs, Git workflows, and relational database concepts.",
  "Strong problem-solving skills, curiosity, and clear written and verbal communication.",
  "Ability to collaborate effectively within the role’s listed work arrangement.",
] as const;

const niceToHave = [
  "Experience with Next.js, Node.js, PostgreSQL, or Docker.",
  "Familiarity with automated testing and continuous integration workflows.",
  "Previous internship, personal project, or open-source contribution involving a full-stack product.",
] as const;

const benefits = [
  "Dedicated mentorship and regular feedback from experienced engineers.",
  "Ownership of meaningful product work used by real customers.",
  "Flexible hybrid schedule, learning budget, and team events.",
  "Opportunity to be considered for a full-time role after the internship.",
] as const;

function DescriptionList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2 pl-4 text-xs leading-5 text-slate-600 marker:text-indigo-500">
      {items.map((item) => (
        <li key={item} className="list-disc pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

type JobDescriptionPanelProps = {
  role: string;
  company: string;
  description: string | null;
  showMockSections?: boolean;
};

export function JobDescriptionPanel({
  role,
  company,
  description,
  showMockSections = true,
}: JobDescriptionPanelProps) {
  return (
    <Card size="sm" className="border border-slate-200 bg-white shadow-none ring-0">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-slate-950">Job Description</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">{role} · {company}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="max-w-3xl space-y-5">
          <section aria-labelledby="about-the-role">
            <h3 id="about-the-role" className="text-xs font-medium text-slate-950">
              About the Role
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
              {description ?? "No job description saved."}
            </p>
          </section>

          {showMockSections ? (
            <>
              <section aria-labelledby="responsibilities">
                <h3 id="responsibilities" className="mb-2 text-xs font-medium text-slate-950">
                  Responsibilities
                </h3>
                <DescriptionList items={responsibilities} />
              </section>

              <section aria-labelledby="requirements">
                <h3 id="requirements" className="mb-2 text-xs font-medium text-slate-950">
                  Requirements
                </h3>
                <DescriptionList items={requirements} />
              </section>

              <section aria-labelledby="nice-to-have">
                <h3 id="nice-to-have" className="mb-2 text-xs font-medium text-slate-950">
                  Nice to Have
                </h3>
                <DescriptionList items={niceToHave} />
              </section>

              <section aria-labelledby="benefits">
                <h3 id="benefits" className="mb-2 text-xs font-medium text-slate-950">
                  Benefits
                </h3>
                <DescriptionList items={benefits} />
              </section>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
