"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { AppUserDisplay } from "@/src/components/layout/dashboard-shell";
import { appRoutes } from "@/src/constants/navigation";
import type { AppMode } from "@/src/types/navigation";

type NavigationItem = {
  name: string;
  href?: string;
  icon: LucideIcon;
  preview?: boolean;
};

const authenticatedNavigation: readonly NavigationItem[] = [
  { name: "Dashboard", href: appRoutes.authenticated.dashboard, icon: LayoutDashboard },
  { name: "Applications", href: appRoutes.authenticated.applications, icon: BriefcaseBusiness },
  { name: "Resumes", href: "/resumes", icon: FileText },
  { name: "AI Studio", href: "/ai-studio", icon: Sparkles },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const demoNavigation: readonly NavigationItem[] = [
  { name: "Dashboard", href: appRoutes.demo.dashboard, icon: LayoutDashboard },
  { name: "Applications", href: appRoutes.demo.applications, icon: BriefcaseBusiness },
  { name: "Resumes", icon: FileText, preview: true },
  { name: "AI Studio", icon: Sparkles, preview: true },
  { name: "Analytics", icon: BarChart3, preview: true },
  { name: "Settings", icon: Settings, preview: true },
];

function isNavigationItemActive(
  pathname: string,
  href: string,
  dashboardHref: string,
): boolean {
  if (href === dashboardHref) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppSidebarProps = {
  mode: AppMode;
  user: AppUserDisplay;
};

export function AppSidebar({ mode, user }: AppSidebarProps) {
  const pathname = usePathname();
  const navigation = mode === "demo" ? demoNavigation : authenticatedNavigation;
  const dashboardHref = appRoutes[mode].dashboard;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-white md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <Link
          href={dashboardHref}
          aria-label="Go to dashboard"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium tracking-tight text-slate-950">
            CareerPilot
          </span>
        </Link>
        {mode === "demo" ? (
          <span className="ml-auto rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-700">
            Demo
          </span>
        ) : null}
      </div>

      <nav className="flex-1 px-2.5 py-4" aria-label="Primary navigation">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;

            if (!item.href) {
              return (
                <li key={item.name}>
                  <span
                    aria-disabled="true"
                    className="flex h-9 cursor-not-allowed items-center gap-2.5 rounded-lg border border-transparent px-2.5 text-sm font-medium text-slate-400"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    <span>{item.name}</span>
                    {item.preview ? (
                      <span className="ml-auto text-[9px] font-medium uppercase tracking-wide text-slate-400">
                        Preview
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            }

            const isActive = isNavigationItemActive(
              pathname,
              item.href,
              dashboardHref,
            );

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg border border-transparent px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                    isActive &&
                      "border-indigo-100 bg-indigo-50 font-semibold text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 p-2.5">
        <section className="rounded-xl border bg-slate-50 p-3" aria-labelledby="weekly-goal-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="weekly-goal-title" className="text-xs font-medium text-slate-900">
              Weekly Goal
            </h2>
            <span className="text-xs font-medium text-indigo-600">4/5</span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            One more application to reach your goal.
          </p>
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Weekly application goal"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={4}
          >
            <div className="h-full w-4/5 rounded-full bg-indigo-600" />
          </div>
        </section>

        {mode === "demo" ? (
          <Link
            href="/sign-in"
            className="flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Open Full App
          </Link>
        ) : null}

        <div className="flex items-center gap-2.5 border-t px-1 pt-3">
          {mode === "authenticated" ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8",
                },
              }}
            />
          ) : (
            <Avatar className="size-8">
              <AvatarFallback className="bg-indigo-100 text-xs font-medium text-indigo-700">
                MK
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-900">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-slate-500">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
