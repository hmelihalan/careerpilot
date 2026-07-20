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
