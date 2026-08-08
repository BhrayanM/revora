"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { changeEmail } from "../profile/actions";

export function SecurityPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await changeEmail(formData);

    setLoading(false);
    if (result.error) {
      setMessage(result.error);
    } else {
      setMessage(
        "A confirmation email has been sent to your new address. Click the link to complete the change.",
      );
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <>
      <CardHeader>
        <h3 className="text-base font-semibold text-foreground">
          Account Security
        </h3>
        <p className="text-sm text-muted-foreground">
          Change the email address associated with your account.
        </p>
      </CardHeader>
      <CardContent>
        {message && (
          <Alert
            variant={message.startsWith("A confirmation") ? "success" : "error"}
            className="mb-4"
          >
            {message}
          </Alert>
        )}
        <form onSubmit={handleEmailChange} className="space-y-4">
          <div className="max-w-sm">
            <Input
              label="New Email"
              name="new_email"
              type="email"
              placeholder="you@newemail.com"
              required
            />
          </div>
          <div>
            <Button type="submit" loading={loading}>
              Change Email
            </Button>
          </div>
        </form>
      </CardContent>
    </>
  );
}
