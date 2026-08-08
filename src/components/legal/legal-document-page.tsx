import { notFound } from "next/navigation";

import {
  getCurrentLegalDocuments,
  type RequiredLegalDocumentType,
} from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";

export async function LegalDocumentPage({
  documentType,
}: {
  documentType: RequiredLegalDocumentType;
}) {
  const supabase = await createClient();
  const documents = await getCurrentLegalDocuments(supabase);
  const document = documents.find(
    (currentDocument) => currentDocument.document_type === documentType,
  );

  if (!document) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-12 sm:py-20">
      <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-10">
        <p className="text-sm font-medium text-primary">
          Version {document.version}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {document.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective{" "}
          {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(
            new Date(document.effective_at),
          )}
        </p>
        <div className="mt-10 whitespace-pre-line text-sm leading-7 text-muted-foreground">
          {document.content}
        </div>
      </article>
    </main>
  );
}
