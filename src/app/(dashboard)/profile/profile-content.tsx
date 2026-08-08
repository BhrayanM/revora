"use client";

import { Bell, Camera, Mail, User } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import type { Database } from "@/lib/supabase/types";

import { updateProfile } from "./actions";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function ProfileContent({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const initials = getInitials(profile.full_name);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      setMessage(result.error ? result.error : "Profile updated.");
    });
  };

  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <span className="text-3xl font-bold text-primary">
                  {initials}
                </span>
              </div>
              <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-primary text-white hover:bg-primary-600 transition-colors">
                <Camera className="size-4" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              {profile.full_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {profile.role === "admin" ? "Administrator" : "Agent"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Joined{" "}
              {new Date(profile.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </p>
            <div className="mt-6 w-full space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground truncate">
                  {profile.email}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                <User className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}{" "}
                  Role
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Personal Information</h3>
            </CardHeader>
            <CardContent>
              {message && (
                <Alert
                  variant={message === "Profile updated." ? "success" : "error"}
                  className="mb-4"
                >
                  {message}
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Full Name"
                    name="full_name"
                    defaultValue={profile.full_name}
                  />
                  <Input label="Email" defaultValue={profile.email} disabled />
                </div>
                <Input
                  label="Phone"
                  name="phone"
                  placeholder="Add your phone number"
                />
                <div className="flex justify-end">
                  <Button type="submit" loading={isPending}>
                    Update Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Preferences</h3>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="size-8 text-muted mb-3" />
                <p className="text-sm text-muted-foreground">
                  Notification preferences coming soon
                </p>
                <p className="text-xs text-muted mt-1">
                  Email and AI digest settings will be available in a future
                  update.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
