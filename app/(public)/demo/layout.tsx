import type { ReactNode } from "react";

import { DashboardShell } from "@/src/components/layout/dashboard-shell";

type DemoLayoutProps = {
  children: ReactNode;
};

export default function DemoLayout({ children }: DemoLayoutProps) {
  return <DashboardShell mode="demo">{children}</DashboardShell>;
}
