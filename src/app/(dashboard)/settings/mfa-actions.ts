"use server";

import { createClient } from "@/lib/supabase/server";

async function requireAal2(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel !== "aal2") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerified = factors?.all?.some(
      (f: { status: string }) => f.status === "verified",
    );
    if (hasVerified) {
      return "MFA verification required for this action. Please verify your identity.";
    }
  }
  return null;
}

export async function enrollTotp() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "AI Growth Platform",
  });

  if (error) return { error: error.message };
  return {
    data: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
  };
}

export async function verifyTotpEnrollment(factorId: string, code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) return { error: challengeError.message };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (verifyError) return { error: verifyError.message };
  return { error: null };
}

export async function unenrollTotp(factorId: string) {
  const aalError = await requireAal2();
  if (aalError) return { error: aalError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: error.message };
  return { error: null };
}

export async function listFactors() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { error: error.message };
  const verifiedFactors =
    data?.all?.filter((f: { status: string }) => f.status === "verified") ?? [];
  return {
    data: {
      enrolled: verifiedFactors.length > 0,
      factors: data?.all ?? [],
    },
  };
}

// Backup code RPCs — disabled pending proper recovery architecture (Model A).
// The schema and RPCs exist but the UI marks them as not yet active.

export async function verifyMfaChallenge(factorId: string, code: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function getAuthenticatorAssuranceLevel() {
  const supabase = await createClient();
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return { error: error.message, aal: null };
  return { error: null, aal: data.currentLevel };
}
