import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return <LegalDocumentPage documentType="terms" />;
}
