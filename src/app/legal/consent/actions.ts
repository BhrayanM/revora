"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCurrentLegalDocument,
  getCurrentLegalDocuments,
  getSafeInternalPath,
  hasCurrentLegalConsent,
} from "@/lib/legal/consent";
import { createClient } from "@/lib/supabase/server";

export type LegalConsentActionState = {
  error?: string;
};

export async function acceptCurrentLegalDocuments(
  _previousState: LegalConsentActionState,
  formData: FormData,
): Promise<LegalConsentActionState> {
  if (formData.get("acceptRequiredLegalDocuments") !== "on") {
    return {
      error: "You must accept the Terms of Service and Privacy Policy.",
    };
  }

  const requestedNextPath = getSafeInternalPath(
    typeof formData.get("next") === "string"
      ? (formData.get("next") as string)
      : null,
  );
  const nextPath = requestedNextPath.startsWith("/legal/consent")
    ? "/dashboard"
    : requestedNextPath;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/legal/consent")}`);
  }

  const documents = await getCurrentLegalDocuments(supabase);
  if (documents.length !== 2) {
    return {
      error:
        "Legal documents are temporarily unavailable. Please try again later.",
    };
  }

  const consentRows = documents.map((document) => ({
    user_id: user.id,
    document_id: document.id,
  }));

  if (formData.get("marketingConsent") === "on") {
    const marketingDocument = await getCurrentLegalDocument(
      supabase,
      "marketing",
    );
    if (!marketingDocument) {
      return {
        error:
          "Marketing consent is temporarily unavailable. Please try again later.",
      };
    }
    consentRows.push({
      user_id: user.id,
      document_id: marketingDocument.id,
    });
  }

  const { error } = await supabase
    .from("user_legal_consents")
    .upsert(consentRows, {
      onConflict: "user_id,document_id",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error("Failed to record legal consent:", error.message);
    return { error: "We could not record your consent. Please try again." };
  }

  if (!(await hasCurrentLegalConsent(supabase, user.id))) {
    return { error: "We could not verify your consent. Please try again." };
  }

  revalidatePath("/dashboard");
  redirect(nextPath);
}
