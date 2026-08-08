import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";

export const metadata: Metadata = {
  title: "Privacy Policy — AI Growth",
};

export default function PrivacyPage() {
  return <LegalDocumentPage documentType="privacy" />;
}
