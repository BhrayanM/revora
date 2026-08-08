"use client";

import {
  CheckCircle2,
  Key,
  LogOut,
  Mail,
  Phone,
  QrCode,
  Shield,
  XCircle,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { changeEmail } from "../profile/actions";

import { changePassword, signOutSessions } from "./actions";
import {
  enrollTotp,
  listFactors,
  unenrollTotp,
  verifyTotpEnrollment,
} from "./mfa-actions";

function StatusBadge({ active, label }: { active: boolean; label?: string }) {
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
      <CardContent className="space-y-8">
        <AccountProtection />
        <SecurityAccordion />
      </CardContent>
    </>
  );
}

function AccountProtection() {
  const [mfaActive, setMfaActive] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const f = await listFactors();
      if (!cancelled && f.data) setMfaActive(f.data.enrolled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const checks = [
    { label: "Email verified", ok: true },
    { label: "Password configured", ok: true },
    { label: "Authenticator MFA", ok: mfaActive === true },
    { label: "Phone verification", ok: false },
    { label: "Recovery email", ok: false },
  ];

  const okCount = checks.filter((c) => c.ok).length;
  const level = okCount >= 4 ? "Strong" : okCount >= 3 ? "Good" : "Basic";

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-1">
        Account Protection
      </h4>
      <p className="text-xs text-muted-foreground mb-4">
        Your overall account security status.
      </p>
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

function SecurityAccordion() {
  const accordionItems = [
    {
      value: "password",
      icon: <Key className="size-4" />,
      title: "Password",
      description:
        "Use at least 10 characters with a mix of letters, numbers, and symbols.",
      children: <PasswordForm />,
    },
    {
      value: "email",
      icon: <Mail className="size-4" />,
      title: "Email Address",
      description: "Change the email address associated with your account.",
      children: <EmailForm />,
    },
    {
      value: "mfa",
      icon: <QrCode className="size-4" />,
      title: "Multi-Factor Authentication",
      description: "Add an extra layer of security with an authenticator app.",
      children: <MfaContent />,
      badge: <MfaBadge />,
    },
    {
      value: "recovery",
      icon: <Key className="size-4" />,
      title: "Recovery Methods",
      description:
        "One-time recovery codes and secondary email for account recovery.",
      children: <RecoveryContent />,
    },
    {
      value: "phone",
      icon: <Phone className="size-4" />,
      title: "Phone Verification",
      description: "Add a verified phone number for account recovery.",
      children: <PhoneContent />,
    },
    {
      value: "sessions",
      icon: <LogOut className="size-4" />,
      title: "Sessions",
      description: "Manage your active sessions.",
      children: <SessionsContent />,
    },
  ];

  return <Accordion items={accordionItems} />;
}

function MfaBadge() {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);

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

  return (
    <StatusBadge
      active={enrolled === true}
      label={enrolled ? "Enabled" : "Not enabled"}
    />
  );
}

function PasswordForm() {
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

function EmailForm() {
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

function MfaContent() {
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

    const verifiedEnabled = factors.data.factors.filter(
      (f) => f.status === "verified",
    );
    if (verifiedEnabled.length === 0) return;

    setMfaLoading(true);
    const result = await unenrollTotp(verifiedEnabled[0]!.id);
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
          <div className="mt-4">
            <Input
              label="Verification Code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
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
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={handleUnenroll}
            loading={mfaLoading}
          >
            Remove Authenticator
          </Button>
          <p className="text-xs text-muted-foreground">
            MFA verification (AAL2) is required to disable this.
          </p>
        </div>
      ) : !enrolling ? (
        <Button onClick={handleEnroll} loading={mfaLoading}>
          <QrCode className="size-4 mr-2" />
          Setup Authenticator
        </Button>
      ) : null}

      {enrolled && (
        <p className="text-xs text-muted-foreground mt-4">
          Tip: Install a second authenticator app on another device as a backup.
          Supabase supports enrolling multiple TOTP factors.
        </p>
      )}
    </div>
  );
}

function RecoveryContent() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-foreground">
          One-Time Recovery Codes
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          Recovery codes are not yet available. We recommend enrolling a second
          authenticator app as a backup.
        </p>
        <Button variant="outline" disabled className="opacity-50 mt-3">
          <Key className="size-4 mr-2" />
          Not Yet Available
        </Button>
      </div>
      <div>
        <h4 className="text-sm font-medium text-foreground">Recovery Email</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Add a secondary email for account recovery if you lose access.
        </p>
        <StatusBadge active={false} label="Not configured" />
        <p className="text-xs text-muted-foreground mt-2">
          Recovery email configuration is planned for a future update.
        </p>
      </div>
    </div>
  );
}

function PhoneContent() {
  return (
    <div>
      <StatusBadge active={false} label="Not configured" />
      <p className="text-xs text-muted-foreground mt-3">
        SMS provider configuration required. This feature will be available
        after an SMS provider (e.g., Twilio) is configured in Supabase.
      </p>
    </div>
  );
}

function SessionsContent() {
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
      {message && (
        <Alert variant="success" className="mb-4">
          {message}
        </Alert>
      )}
      <div className="space-y-4">
        <div>
          <Button
            variant="outline"
            onClick={() => handleSignOut("others")}
            loading={loading}
          >
            <LogOut className="size-4 mr-2" />
            Sign Out Other Sessions
          </Button>
          <p className="text-xs text-muted-foreground mt-1.5">
            End all sessions on other devices. Already-issued access tokens
            remain valid until they expire.
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={() => handleSignOut("global")}
            loading={loading}
          >
            <LogOut className="size-4 mr-2" />
            Sign Out Everywhere
          </Button>
          <p className="text-xs text-muted-foreground mt-1.5">
            Sign out of all devices including this one.
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Session details (device, location, last active) are not available from
        the current auth provider.
      </p>
    </div>
  );
}
