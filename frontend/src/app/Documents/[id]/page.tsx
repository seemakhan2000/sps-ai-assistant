
import { Suspense } from "react";
import DocumentDetailPage from "@/src/features/documents/components/DocumentDetailPage";

export const metadata = { title: "Document | SPS AI Assistant" };

export default function Page() {
  return (
    <Suspense fallback={<div>Loading document…</div>}>
      <DocumentDetailPage />
    </Suspense>
  );
}