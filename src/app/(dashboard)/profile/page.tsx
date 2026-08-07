import { Camera, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { getCurrentProfile } from "@/lib/auth";

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function isOwner(role: string): boolean {
  return role === "owner" || role === "admin";
}

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <Container className="max-w-none px-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Unable to load profile. Please try again.
        </p>
      </Container>
    );
  }

  const initials = getInitials(profile.full_name);

  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
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
            <p className="text-sm text-zinc-500">
              {isOwner(profile.role) ? "Administrator" : "Agent"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Joined{" "}
              {new Date(profile.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </p>

            <div className="mt-6 w-full space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                <Mail className="size-4 text-zinc-500" />
                <span className="text-zinc-600 truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                <User className="size-4 text-zinc-500" />
                <span className="text-zinc-600">
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
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full Name" defaultValue={profile.full_name} />
                <Input label="Email" defaultValue={profile.email} disabled />
              </div>
              <Input label="Phone" placeholder="Add your phone number" />
              <div className="flex justify-end">
                <Button>Update Profile</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Preferences</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Email Notifications",
                  desc: "Receive email updates about leads and pipeline changes",
                  defaultChecked: true,
                },
                {
                  label: "AI Insights Digest",
                  desc: "Daily AI-powered insights and recommendations",
                  defaultChecked: true,
                },
              ].map((pref) => (
                <label
                  key={pref.label}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    defaultChecked={pref.defaultChecked}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {pref.label}
                    </p>
                    <p className="text-xs text-zinc-500">{pref.desc}</p>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
