import Link from "next/link";
import { BriefcaseBusiness, SearchX } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-12 sm:px-6"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <Link
          href="/"
          className="mx-auto inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="CareerPilot home"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BriefcaseBusiness className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium tracking-tight text-slate-950">
            CareerPilot
          </span>
        </Link>

        <span className="mx-auto mt-8 flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <SearchX className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-indigo-600">
          404
        </p>
        <h1
          id="not-found-title"
          className="mt-2 text-2xl font-medium tracking-tight text-slate-950 sm:text-3xl"
        >
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          The page you’re looking for doesn’t exist or you may not have access to it.
        </p>

        <nav
          aria-label="Not found page actions"
          className="mt-7 flex flex-col justify-center gap-2 sm:flex-row"
        >
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ size: "lg" }),
              "focus-visible:ring-indigo-500",
            )}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/demo"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "focus-visible:ring-indigo-500",
            )}
          >
            View Demo
          </Link>
        </nav>
      </div>
    </section>
  );
}
