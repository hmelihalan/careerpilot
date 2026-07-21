"use client";

import Link from "next/link";
import { BriefcaseBusiness, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAddApplicationDialog } from "@/src/components/applications/create/add-application-dialog";
import type { AppUserDisplay } from "@/src/components/layout/dashboard-shell";
import { MobileAppNavigation } from "@/src/components/layout/mobile-app-navigation";
import { appRoutes } from "@/src/constants/navigation";
import type { AppMode } from "@/src/types/navigation";

type AppHeaderProps = {
  mode: AppMode;
  user: AppUserDisplay;
};

export function AppHeader({ mode, user }: AppHeaderProps) {
  const { openAddApplicationDialog } = useAddApplicationDialog();

  return (
    <header className="sticky top-0 z-20 border-b bg-white">
      <div className="mx-auto flex h-14 max-w-360 items-center gap-2 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-1.5 md:hidden">
          <MobileAppNavigation mode={mode} user={user} />
          <Link
            href={appRoutes[mode].dashboard}
            aria-label="Go to dashboard"
            className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-medium tracking-tight text-slate-950">
              CareerPilot
            </span>
          </Link>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {mode === "demo" ? (
            <span className="hidden rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 sm:inline-flex">
              Demo Mode
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={openAddApplicationDialog}
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            <span className="hidden sm:inline">Add Application</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
