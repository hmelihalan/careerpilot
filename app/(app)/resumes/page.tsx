import { ResumesPageContent } from "@/src/components/resumes/resumes-page-content";
import { getResumesForCurrentUser } from "@/src/server/resumes/get-resumes";

export default async function ResumesPage() {
  const resumes = await getResumesForCurrentUser();

  return <ResumesPageContent resumes={resumes} />;
}
