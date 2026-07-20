import type { ReactNode } from "react";

import { AddApplicationDialog } from "@/src/components/applications/create/add-application-dialog";
import { AppHeader } from "@/src/components/layout/app-header";
import { AppSidebar } from "@/src/components/layout/app-sidebar";
import type { AppMode } from "@/src/types/navigation";

export type AppUserDisplay = {
  name: string;
  email: string;
};

type DashboardShellProps = {
  children: ReactNode;
} & (
  | { mode?: "authenticated"; user: AppUserDisplay }
  | { mode: "demo"; user?: never }
);

const demoUser: AppUserDisplay = {
  name: "Melih Kaya",
  email: "melih@careerpilot.demo",
};

export function DashboardShell(props: DashboardShellProps) {
  const mode: AppMode = props.mode ?? "authenticated";
  const user = props.mode === "demo" ? demoUser : props.user;

  return (
    <AddApplicationDialog demoMode={mode === "demo"}>
      <div className="min-h-screen bg-slate-50">
        <AppSidebar mode={mode} user={user} />
        <div className="min-w-0 md:pl-56">
          <AppHeader mode={mode} />
          <main className="mx-auto w-full max-w-360 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            {props.children}
          </main>
        </div>
      </div>
    </AddApplicationDialog>
  );
}
