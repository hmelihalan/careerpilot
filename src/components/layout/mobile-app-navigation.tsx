"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Menu } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AppUserDisplay } from "@/src/components/layout/dashboard-shell";
import {
  appNavigation,
  appRoutes,
  isAppNavigationItemActive,
} from "@/src/constants/navigation";
import type { AppMode } from "@/src/types/navigation";

type MobileAppNavigationProps = {
  mode: AppMode;
  user: AppUserDisplay;
};

export function MobileAppNavigation({ mode, user }: MobileAppNavigationProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navigation = appNavigation[mode];
  const dashboardHref = appRoutes[mode].dashboard;

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");

    function closeAtDesktop(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }

    desktopQuery.addEventListener("change", closeAtDesktop);

    return () => desktopQuery.removeEventListener("change", closeAtDesktop);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        nativeButton
        type="button"
        aria-label="Open navigation"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "rounded-lg text-slate-700 md:hidden",
        )}
      >
        <Menu className="size-5" aria-hidden="true" />
      </DialogTrigger>

      <DialogContent
        showCloseButton
        className="inset-y-0 left-0 top-0 grid h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none border-r border-slate-200 bg-white p-0 shadow-xl sm:max-w-none md:hidden data-closed:slide-out-to-left data-closed:zoom-out-100 data-open:slide-in-from-left data-open:zoom-in-100"
      >
        <DialogHeader className="gap-0 border-b px-4 py-3.5 pr-12">
          <DialogTitle className="flex items-center gap-2.5 text-sm text-slate-950">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
            </span>
            CareerPilot navigation
            {mode === "demo" ? (
              <span className="rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-indigo-700">
                Demo
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Navigate to a CareerPilot workspace section.
          </DialogDescription>
        </DialogHeader>

        <nav className="overflow-y-auto px-3 py-4" aria-label="Primary navigation">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              if (!item.href) {
                return (
                  <li key={item.name}>
                    <span
                      aria-disabled="true"
                      className="flex h-10 cursor-not-allowed items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-slate-400"
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

              const isActive = isAppNavigationItemActive(
                pathname,
                item.href,
                dashboardHref,
              );

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                      isActive &&
                        "border-indigo-100 bg-indigo-50 font-semibold text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    <span>{item.name}</span>
                    {isActive ? (
                      <span
                        className="ml-auto size-1.5 rounded-full bg-indigo-600"
                        aria-hidden="true"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-3 border-t bg-white p-3">
          <section
            className="rounded-xl border bg-slate-50 p-3"
            aria-labelledby="mobile-weekly-goal-title"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="mobile-weekly-goal-title"
                className="text-xs font-medium text-slate-900"
              >
                Weekly Goal
              </h2>
              {mode === "demo" ? (
                <span className="text-xs font-medium text-indigo-600">Demo 4/5</span>
              ) : null}
            </div>
            {mode === "demo" ? (
              <>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Simulated progress: one more application to reach the sample goal.
                </p>
                <div
                  className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="Simulated weekly application goal"
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={4}
                >
                  <div className="h-full w-4/5 rounded-full bg-indigo-600" />
                </div>
              </>
            ) : (
              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                Weekly goal not set
              </p>
            )}
          </section>

          {mode === "demo" ? (
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
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
              <p className="truncate text-xs font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-[11px] text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
