import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileSearch,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

const features = [
  {
    title: "Application Tracking",
    description: "Keep every opportunity and next step organized in one place.",
    icon: BriefcaseBusiness,
  },
  {
    title: "AI Resume Matching",
    description: "Understand how your experience aligns with each role.",
    icon: FileSearch,
  },
  {
    title: "Interview Preparation",
    description: "Prepare focused questions and talking points for every interview.",
    icon: MessageSquareText,
  },
] as const;

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BriefcaseBusiness className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium tracking-tight text-slate-950">
              CareerPilot
            </span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Account navigation">
            <Link
              href={userId ? "/dashboard" : "/sign-in"}
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {userId ? "Dashboard" : "Sign In"}
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              View Demo
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <Sparkles className="size-3" aria-hidden="true" />
            A clearer path through your job search
          </span>
          <h1 className="mt-5 text-3xl font-medium tracking-tight text-slate-950 sm:text-5xl">
            Organize your job search. Apply smarter.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Track applications, understand role fit, and prepare for every next
            step with a focused workspace built for modern job seekers.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              View Demo
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={userId ? "/dashboard" : "/sign-in"}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {userId ? "Open Full App" : "Sign In"}
            </Link>
            {!userId ? (
              <Link
                href="/sign-up"
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Create Account
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-14 grid gap-3 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-none"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-sm font-medium text-slate-950">
                  {feature.title}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
