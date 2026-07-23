import {
  BarChart3,
  BriefcaseBusiness,
  LayoutDashboard,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { AppMode, AppRouteConfig } from "@/src/types/navigation";

export const appRoutes = {
  authenticated: {
    dashboard: "/dashboard",
    applications: "/applications",
  },
  demo: {
    dashboard: "/demo",
    applications: "/demo/applications",
  },
} as const satisfies Record<AppMode, AppRouteConfig>;

export type AppNavigationItem = {
  name: string;
  href?: string;
  icon: LucideIcon;
  preview?: boolean;
};

export const appNavigation: Record<AppMode, readonly AppNavigationItem[]> = {
  authenticated: [
    {
      name: "Dashboard",
      href: appRoutes.authenticated.dashboard,
      icon: LayoutDashboard,
    },
    {
      name: "Applications",
      href: appRoutes.authenticated.applications,
      icon: BriefcaseBusiness,
    },
    { name: "AI Studio", href: "/ai-studio", icon: Sparkles },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ],
  demo: [
    { name: "Dashboard", href: appRoutes.demo.dashboard, icon: LayoutDashboard },
    {
      name: "Applications",
      href: appRoutes.demo.applications,
      icon: BriefcaseBusiness,
    },
    { name: "AI Studio", icon: Sparkles, preview: true },
    { name: "Analytics", icon: BarChart3, preview: true },
    { name: "Settings", icon: Settings, preview: true },
  ],
};

export function isAppNavigationItemActive(
  pathname: string,
  href: string,
  dashboardHref: string,
): boolean {
  if (href === dashboardHref) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
