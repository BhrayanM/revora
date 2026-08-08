"use client";

import {
  CheckCircle2,
  Copy,
  Download,
  Key,
  LogOut,
  QrCode,
  Shield,
  XCircle,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { changeEmail } from "../profile/actions";

import { changePassword, signOutSessions } from "./actions";
import {
  countBackupCodes,
  enrollTotp,
  generateBackupCodes,
  listFactors,
  unenrollTotp,
  verifyTotpEnrollment,
} from "./mfa-actions";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-semibold text-foreground mb-1">{children}</h4>
  );
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mb-4">{children}</p>;
}

interface StatusBadgeProps {
  active: boolean;
  label?: string;
}

function StatusBadge({ active, label }: StatusBadgeProps) {
  return (
    <Badge
      variant={active ? "success" : "secondary"}
      className="inline-flex items-center gap-1 text-xs"
    >
      {active ? (
        <CheckCircle2 className="size-3" />
      ) : (
        <XCircle className="size-3" />
      )}
      {label ?? (active ? "Configured" : "Not configured")}
    </Badge>
  );
}

export function SecurityPanel() {
  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Account Security
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage your account security settings.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-10">
        <AccountProtection />
        <ChangePasswordSection />
        <ChangeEmailSection />
        <MfaSection />
        <BackupCodesSection />
        <PhoneSection />
        <RecoveryEmailSection />
        <SessionSection />
      </CardContent>
    </>
  );
}

function AccountProtection() {
  const [mfaActive, setMfaActive] = useState<boolean | null>(null);
  const [backupCount, setBackupCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const f = await listFactors();
      if (!cancelled && f.data) setMfaActive(f.data.enrolled);
      const b = await countBackupCodes();
      if (!cancelled && !b.error) setBackupCount(b.count);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const checks = [
    { label: "Email verified", ok: true },
    { label: "Password configured", ok: true },
    { label: "Authenticator MFA", ok: mfaActive === true },
    { label: "Backup codes", ok: backupCount > 0 },
    { label: "Phone verification", ok: false },
    { label: "Recovery email", ok: false },
  ];

  const okCount = checks.filter((c) => c.ok).length;
  const level = okCount >= 5 ? "Strong" : okCount >= 4 ? "Good" : "Basic";

  return (
    <div>
      <SectionTitle>Account Protection</SectionTitle>
      <SectionDesc>Your overall account security status.</SectionDesc>
      <div className="rounded-xl border border-border bg-surface-secondary p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">
            Protection Level
          </span>
          <Badge
            variant={
              level === "Strong"
                ? "success"
                : level === "Good"
                  ? "warning"
                  : "error"
            }
          >
            {level}
          </Badge>
        </div>
        <div className="space-y-1.5">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              {c.ok ? (
                <CheckCircle2 className="size-3.5 text-success shrink-0" />
              ) : mfaActive === null && c.label === "Authenticator MFA" ? (
                <div className="size-3.5 shrink-0 rounded-full border-2 border-muted-foreground/20" />
              ) : (
                <XCircle className="size-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span
                className={cn(
                  c.ok ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await changePassword(fd);
    setLoading(false);
    setMessage(result.error ?? "Password changed successfully.");
    if (!result.error) (e.target as HTMLFormElement).reset();
  };

  return (
    <div>
      <SectionTitle>Change Password</SectionTitle>
      <SectionDesc>
        Use at least 10 characters with a mix of letters, numbers, and symbols.
      </SectionDesc>
      {message && (
        <Alert
          variant={message.startsWith("Password changed") ? "success" : "error"}
          className="mb-4"
        >
          {message}
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        <Input
          label="Current Password"
          name="current_password"
          type="password"
          required
          placeholder="Enter current password"
        />
        <Input
          label="New Password"
          name="new_password"
          type="password"
          required
          minLength={10}
          placeholder="At least 10 characters"
        />
        <Input
          label="Confirm New Password"
          name="confirm_password"
          type="password"
          required
          minLength={10}
          placeholder="Re-enter new password"
        />
        <Button type="submit" loading={loading}>
          Update Password
        </Button>
      </form>
    </div>
  );
}

function ChangeEmailSection() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await changeEmail(fd);
    setLoading(false);
    setMessage(
      result.error ?? "A confirmation email has been sent to your new address.",
    );
    if (!result.error) (e.target as HTMLFormElement).reset();
  };

  return (
    <div>
      <SectionTitle>Email Address</SectionTitle>
      <SectionDesc>
        Change the email address associated with your account.
      </SectionDesc>
      {message && (
        <Alert
          variant={message.startsWith("A confirmation") ? "success" : "error"}
          className="mb-4"
        >
          {message}
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        <Input
          label="New Email"
          name="new_email"
          type="email"
          required
          placeholder="you@newemail.com"
        />
        <Button type="submit" loading={loading}>
          Change Email
        </Button>
      </form>
    </div>
  );
}

function MfaSection() {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listFactors();
      if (!cancelled && result.data) setEnrolled(result.data.enrolled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnroll = async () => {
    setMfaMessage(null);
    setMfaLoading(true);
    const result = await enrollTotp();
    setMfaLoading(false);
    if (result.error) {
      setMfaMessage(result.error);
      return;
    }
    if (result.data) {
      setFactorId(result.data.factorId);
      setQrCode(result.data.qrCode);
      setSecret(result.data.secret);
      setEnrolling(true);
    }
  };

  const handleVerify = async () => {
    if (!factorId || !verifyCode) return;
    setMfaMessage(null);
    setMfaLoading(true);
    const result = await verifyTotpEnrollment(factorId, verifyCode);
    setMfaLoading(false);
    if (result.error) {
      setMfaMessage(result.error);
    } else {
      setMfaMessage("Authenticator app configured successfully.");
      setEnrolling(false);
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode("");
      setEnrolled(true);
    }
  };

  const handleUnenroll = async () => {
    const factors = await listFactors();
    if (!factors.data?.factors.length) return;
    setMfaLoading(true);
    const result = await unenrollTotp(factors.data.factors[0]!.id);
    setMfaLoading(false);
    if (result.error) {
      setMfaMessage(result.error);
    } else {
      setMfaMessage("Authenticator app removed.");
      setEnrolled(false);
    }
  };

  const handleCancelEnroll = () => {
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode("");
  };

  return (
    <div>
      <SectionTitle>Multi-Factor Authentication</SectionTitle>
      <SectionDesc>
        Add an extra layer of security with an authenticator app.
      </SectionDesc>

      {mfaMessage && (
        <Alert
          variant={
            mfaMessage.includes("successfully") ||
            mfaMessage.includes("removed")
              ? "success"
              : "error"
          }
          className="mb-4"
        >
          {mfaMessage}
        </Alert>
      )}

      <div className="flex items-center gap-3 mb-4">
        <StatusBadge
          active={enrolled === true}
          label={enrolled ? "Enabled" : "Not enabled"}
        />
      </div>

      {enrolling && qrCode && (
        <div className="rounded-xl border border-border bg-surface-secondary p-4 mb-4 max-w-sm">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="size-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Scan QR Code
            </span>
          </div>
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="TOTP QR Code"
              className="h-44 w-44 rounded-lg border border-border bg-white p-2"
            />
          </div>
          {secret && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Or enter this key manually:
              </p>
              <code className="block rounded bg-surface px-2 py-1 text-xs text-foreground font-mono break-all">
                {secret}
              </code>
            </div>
          )}
          <div className="flex items-center gap-2 mt-4">
            <Input
              label="Verification Code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button
              onClick={handleVerify}
              loading={mfaLoading}
              disabled={verifyCode.length !== 6}
            >
              Verify
            </Button>
            <Button variant="outline" onClick={handleCancelEnroll}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {enrolled ? (
        <Button variant="outline" onClick={handleUnenroll} loading={mfaLoading}>
          Remove Authenticator
        </Button>
      ) : !enrolling ? (
        <Button onClick={handleEnroll} loading={mfaLoading}>
          <QrCode className="size-4 mr-2" />
          Setup Authenticator
        </Button>
      ) : null}
    </div>
  );
}

function BackupCodesSection() {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [codeCount, setCodeCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await countBackupCodes();
      if (!cancelled && !result.error) setCodeCount(result.count);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setMessage(null);
    setLoading(true);
    const result = await generateBackupCodes();
    setLoading(false);
    if (result.error) {
      setMessage(result.error);
    } else if (result.codes) {
      setCodes(result.codes);
      setCodeCount(result.codes.length);
    }
  };

  const handleCopy = () => {
    if (!codes) return;
    navigator.clipboard.writeText(codes.join("\n")).catch(() => {});
    setMessage("Codes copied to clipboard.");
  };

  const handleDownload = () => {
    if (!codes) return;
    const blob = new Blob([codes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-growth-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDismiss = () => {
    setCodes(null);
    setMessage(null);
  };

  return (
    <div>
      <SectionTitle>Backup Codes</SectionTitle>
      <SectionDesc>
        One-time recovery codes for when you lose access to your authenticator.
      </SectionDesc>

      {codeCount !== null && codeCount > 0 && !codes && (
        <p className="text-xs text-muted-foreground mb-3">
          {codeCount} unused backup code{codeCount !== 1 ? "s" : ""} available.
        </p>
      )}

      {codes && codes.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 mb-4 max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <Key className="size-4 text-warning" />
            <span className="text-sm font-medium text-foreground">
              Your Recovery Codes
            </span>
          </div>
          <p className="text-xs text-warning mb-3">
            These codes will only be shown once. Save them securely.
          </p>
          <div className="rounded-lg border border-border bg-surface p-3 font-mono text-xs text-foreground space-y-1">
            {codes.map((code, i) => (
              <div key={i} className="select-all">
                {code}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="size-3.5 mr-1" /> Copy All
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="size-3.5 mr-1" /> Download
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              Done
            </Button>
          </div>
        </div>
      )}

      {message && !codes && (
        <Alert variant="info" className="mb-4">
          {message}
        </Alert>
      )}

      <Button variant="outline" onClick={handleGenerate} loading={loading}>
        <Key className="size-4 mr-2" />
        {codeCount && codeCount > 0
          ? "Regenerate Codes"
          : "Generate Recovery Codes"}
      </Button>
    </div>
  );
}

function PhoneSection() {
  return (
    <div>
      <SectionTitle>Phone Verification</SectionTitle>
      <SectionDesc>
        Add a verified phone number for account recovery.
      </SectionDesc>
      <StatusBadge active={false} label="Not configured" />
      <p className="text-xs text-muted-foreground mt-3">
        SMS provider configuration required. This feature will be available
        after an SMS provider (e.g., Twilio) is configured in Supabase.
      </p>
    </div>
  );
}

function RecoveryEmailSection() {
  return (
    <div>
      <SectionTitle>Recovery Email</SectionTitle>
      <SectionDesc>
        Add a secondary email for account recovery if you lose access.
      </SectionDesc>
      <StatusBadge active={false} label="Not configured" />
      <p className="text-xs text-muted-foreground mt-3">
        Recovery email configuration is planned for a future update.
      </p>
    </div>
  );
}

function SessionSection() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async (scope: "others" | "global") => {
    setMessage(null);
    setLoading(true);
    const result = await signOutSessions(scope);
    setLoading(false);
    if (result.error) {
      setMessage(result.error);
    } else if (result.redirect) {
      window.location.href = result.redirect;
      return;
    } else {
      setMessage(
        scope === "others"
          ? "All other sessions have been signed out."
          : "Signed out successfully.",
      );
    }
  };

  return (
    <div>
      <SectionTitle>Sessions</SectionTitle>
      <SectionDesc>Manage your active sessions.</SectionDesc>
      {message && (
        <Alert variant="success" className="mb-4">
          {message}
        </Alert>
      )}
      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={() => handleSignOut("others")}
          loading={loading}
        >
          <LogOut className="size-4 mr-2" />
          Sign Out Other Sessions
        </Button>
        <p className="text-xs text-muted-foreground">
          This will end all sessions on other devices. You will stay signed in
          here.
        </p>
      </div>
      <div className="mt-4 space-y-2">
        <Button
          variant="outline"
          onClick={() => handleSignOut("global")}
          loading={loading}
        >
          <LogOut className="size-4 mr-2" />
          Sign Out Everywhere
        </Button>
        <p className="text-xs text-muted-foreground">
          This will sign you out of all devices including this one.
        </p>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Session details (device, location, last active) are not available from
        the current auth provider.
      </p>
    </div>
  );
}
