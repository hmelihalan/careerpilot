import { notFound } from "next/navigation";

import { ApplicationDetailPageContent } from "@/src/components/applications/detail/application-detail-page-content";
import { getMockApplicationBySlug } from "@/src/constants/mock-applications";

type DemoApplicationDetailPageProps = {
  params: Promise<{ applicationId: string }>;
};

export default async function DemoApplicationDetailPage({
  params,
}: DemoApplicationDetailPageProps) {
  const { applicationId } = await params;
  const application = getMockApplicationBySlug(applicationId);

  if (!application) {
    notFound();
  }

  return <ApplicationDetailPageContent application={application} mode="demo" />;
}
