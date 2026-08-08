import { getActiveMembership, getCurrentProfile } from "@/lib/auth";

import { ProfileContent } from "./profile-content";

export default async function ProfilePage() {
  const [profile, membership] = await Promise.all([
    getCurrentProfile(),
    getActiveMembership(),
  ]);

  if (!profile) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Unable to load profile.
        </p>
      </div>
    );
  }

  return <ProfileContent profile={profile} membershipRole={membership?.role} />;
}
