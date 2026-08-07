import { getCurrentProfile } from "@/lib/auth";

import { ProfileContent } from "./profile-content";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-2 text-sm text-zinc-500">Unable to load profile.</p>
      </div>
    );
  }

  return <ProfileContent profile={profile} />;
}
