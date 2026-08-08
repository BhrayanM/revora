import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";

export const metadata: Metadata = {
  title: "Terms of Service — AI Growth Platform",
};

export default function TermsPage() {
  return <LegalDocumentPage documentType="terms" />;
}
