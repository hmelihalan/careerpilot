import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { BriefcaseBusiness } from "lucide-react";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="px-4 py-5 sm:px-6">
        <Link
          href="/"
          className="mx-auto flex w-fit items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BriefcaseBusiness className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium tracking-tight text-slate-950">
            CareerPilot
          </span>
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </main>
  );
}
