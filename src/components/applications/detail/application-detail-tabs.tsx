"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export const applicationDetailTabIds = [
  "overview",
  "job-description",
  "notes",
  "resume-match",
  "cover-letter",
  "interview-prep",
  "activity",
] as const;

export type ApplicationDetailTabId = (typeof applicationDetailTabIds)[number];

export type ApplicationDetailTab = {
  id: ApplicationDetailTabId;
  label: string;
  content: ReactNode;
};

type ApplicationDetailTabsProps = {
  tabs: readonly ApplicationDetailTab[];
};

function isApplicationDetailTabId(
  value: string | null,
): value is ApplicationDetailTabId {
  return applicationDetailTabIds.some((tabId) => tabId === value);
}

export function ApplicationDetailTabs({ tabs }: ApplicationDetailTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: ApplicationDetailTabId = isApplicationDetailTabId(requestedTab)
    ? requestedTab
    : "overview";
  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  function selectTab(tabId: ApplicationDetailTabId) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("tab", tabId);
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    tabIndex: number,
  ) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") {
      nextIndex = (tabIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (tabIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    const tabButtons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );

    if (nextTab) {
      selectTab(nextTab.id);
      tabButtons?.[nextIndex]?.focus();
    }
  }

  return (
    <div className="min-w-0">
      <div className="scrollbar-thin overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Application details">
        <div className="flex min-w-max gap-5 px-0.5">
          {tabs.map((tab, tabIndex) => {
            const selected = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, tabIndex)}
                className={cn(
                  "cursor-pointer border-b-2 border-transparent px-0.5 pb-2.5 pt-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                  selected && "border-indigo-600 text-indigo-700",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="pt-4"
      >
        {activeContent}
      </div>
    </div>
  );
}
