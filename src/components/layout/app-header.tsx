"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Plus, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAddApplicationDialog } from "@/src/components/applications/create/add-application-dialog";
import type { AppMode } from "@/src/types/navigation";

type AppHeaderProps = {
  mode: AppMode;
};

export function AppHeader({ mode }: AppHeaderProps) {
  const { openAddApplicationDialog } = useAddApplicationDialog();

  return (
    <header className="sticky top-0 z-20 border-b bg-white">
      <div className="mx-auto flex h-14 max-w-360 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search applications"
            placeholder="Search applications..."
            className="h-8 rounded-lg border-slate-200 bg-slate-50 pl-8 text-sm shadow-none focus-visible:bg-white"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {mode === "demo" ? (
            <span className="hidden rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 sm:inline-flex">
              Demo Mode
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="View notifications"
            className="rounded-lg text-slate-600"
          >
            <Bell className="size-4" aria-hidden="true" />
          </Button>
          <div className="hidden sm:block">
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
          </div>
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
