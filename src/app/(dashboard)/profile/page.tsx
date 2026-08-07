import { Camera, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  return (
    <Container className="max-w-none px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <span className="text-3xl font-bold text-primary">JS</span>
              </div>
              <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-primary text-white hover:bg-primary-600 transition-colors">
                <Camera className="size-4" />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              John Smith
            </h2>
            <p className="text-sm text-zinc-500">Administrator</p>
            <p className="mt-1 text-xs text-zinc-400">
              Member since January 2026
            </p>

            <div className="mt-6 w-full space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                <Mail className="size-4 text-zinc-400" />
                <span className="text-zinc-600">john@aigrowth.io</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-sm">
                <User className="size-4 text-zinc-400" />
                <span className="text-zinc-600">Admin Role</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Personal Information</h3>
              <p className="text-sm text-zinc-500">
                Update your personal details.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="First Name" defaultValue="John" />
                <Input label="Last Name" defaultValue="Smith" />
              </div>
              <Input label="Email" defaultValue="john@aigrowth.io" />
              <Input label="Phone" defaultValue="+1 (555) 123-4567" />
              <Input label="Job Title" defaultValue="Sales Director" />
              <div className="flex justify-end">
                <Button>Update Profile</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Preferences</h3>
              <p className="text-sm text-zinc-500">
                Customize your experience.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Email Notifications",
                  desc: "Receive email updates about leads and pipeline changes",
                  defaultChecked: true,
                },
                {
                  label: "SMS Alerts",
                  desc: "Get SMS notifications for high-priority leads",
                  defaultChecked: false,
                },
                {
                  label: "Weekly Reports",
                  desc: "Receive weekly analytics and performance reports",
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

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Change Password</h3>
              <p className="text-sm text-zinc-500">
                Update your account password.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="Current Password" type="password" />
              <Input label="New Password" type="password" />
              <Input label="Confirm New Password" type="password" />
              <div className="flex justify-end">
                <Button variant="outline">Change Password</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
