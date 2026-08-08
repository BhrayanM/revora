"use server";

import { createClient } from "@/lib/supabase/server";

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
  return { data: { enrolled: data.all.length > 0, factors: data.all } };
}

export async function generateBackupCodes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { error: "Not authenticated", codes: null as string[] | null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: codes, error } = await (supabase.rpc as any)(
    "generate_backup_codes",
    {
      p_profile_id: user.id,
      p_count: 10,
    },
  );

  if (error) return { error: error.message, codes: null };
  return { error: null, codes: codes as string[] };
}

export async function countBackupCodes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", count: 0 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("count_backup_codes", {
    p_profile_id: user.id,
  });

  if (error) return { error: error.message, count: 0 };
  return { error: null, count: data as number };
}

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
