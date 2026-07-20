import {
  Copy,
  FileText,
  Pencil,
  RefreshCw,
  Save,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CoverLetterPanel() {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white shadow-none ring-0">
      <CardHeader className="gap-3 border-b border-slate-100 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <CardTitle>Cover Letter</CardTitle>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Created July 9, 2026 · Professional tone
          </p>
        </div>
        <Badge className="w-fit rounded-md bg-slate-100 px-2 text-[11px] font-medium text-slate-600">
          Software Engineering Resume
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
          <article className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white px-5 py-6 text-[13px] leading-6 text-slate-700 shadow-sm sm:px-8 sm:py-8">
            <p>July 9, 2026</p>
            <p className="mt-5">Dear Kron Hiring Team,</p>
            <p className="mt-4">
              I am excited to apply for the Full Stack Intern position at Kron. As a
              software engineering student with hands-on experience building responsive
              web applications, I am eager to contribute my full-stack skills to a team
              creating reliable, user-focused software.
            </p>
            <p className="mt-4">
              Through academic and personal projects, I have developed applications with
              React, TypeScript, Node.js, and relational databases. I enjoy turning
              requirements into clear interfaces, designing maintainable APIs, and working
              through technical problems methodically. My experience collaborating with
              Git-based workflows has also taught me to communicate decisions clearly,
              welcome feedback, and deliver dependable improvements in small iterations.
            </p>
            <p className="mt-4">
              Kron&apos;s focus on solving complex technology challenges is especially
              compelling to me. The opportunity to learn from experienced engineers while
              contributing across the stack would let me strengthen both my technical
              judgment and my understanding of production software. I would bring
              curiosity, attention to detail, and a strong willingness to learn to the
              role.
            </p>
            <p className="mt-4">
              Thank you for considering my application. I would welcome the opportunity to
              discuss how my background and enthusiasm for software engineering could
              support Kron&apos;s team.
            </p>
            <p className="mt-5">
              Sincerely,
              <br />
              Candidate Name
            </p>
          </article>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg">
            <Pencil data-icon="inline-start" aria-hidden="true" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg">
            <Copy data-icon="inline-start" aria-hidden="true" />
            Copy
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg">
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Regenerate
          </Button>
          <Button size="sm" className="rounded-lg sm:ml-auto">
            <Save data-icon="inline-start" aria-hidden="true" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
