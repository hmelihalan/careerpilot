import type { ReactNode } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/src/components/layout/dashboard-shell";
import { requireUser } from "@/src/server/auth/require-user";

type ProtectedAppLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedAppLayout({
  children,
}: ProtectedAppLayoutProps) {
  await requireUser();
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "CareerPilot user";
  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    "Signed in";

  return (
    <DashboardShell user={{ name, email }}>
      {children}
    </DashboardShell>
  );
}
