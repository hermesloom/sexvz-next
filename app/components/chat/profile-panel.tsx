import { useEffect, useState } from "react";
import Image from "next/image";
import { Profile } from "./types";

interface ProfilePanelProps {
  userId: string;
  sessionId: string;
}

export function ProfilePanel({ userId, sessionId }: ProfilePanelProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/profile?id=${userId}`, {
      headers: { "x-session-id": sessionId },
    })
      .then((r) => r.json())
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [userId, sessionId]);
  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  if (!profile)
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400">
        No profile found
      </div>
    );
  return <ProfileView profile={profile} />;
}

function ProfileView({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col gap-4 p-0">
      <div className="w-full h-64 flex items-center justify-center bg-white">
        <Image
          src={profile.imageUrl}
          alt={profile.username}
          className="max-h-64 w-auto object-contain"
          width={384}
          height={256}
        />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="font-bold text-lg">{profile.username}</div>
            <div className="text-sm text-zinc-500">{profile.location}</div>
            <div className="text-xs text-zinc-400">
              {profile.type}
              {profile.age ? `, ${profile.age}` : ""}
            </div>
          </div>
        </div>
        <div className="text-sm">
          {profile.orientation && <div>Orientation: {profile.orientation}</div>}
          {profile.alignment && <div>Alignment: {profile.alignment}</div>}
        </div>
        <div className="text-sm">
          <div className="font-semibold mb-1">Group Memberships</div>
          <ul className="list-disc list-inside">
            {profile.groupMemberships.map((g) => (
              <li key={g.id}>{g.name}</li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <div className="font-semibold mb-1">Writes to types</div>
          <div>Male: {profile.writesToTypes.male}%</div>
          <div>Female: {profile.writesToTypes.female}%</div>
          <div>Couple: {profile.writesToTypes.couple}%</div>
        </div>
        <a
          href={profile.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline text-sm"
        >
          View on sexVZ
        </a>
      </div>
    </div>
  );
}
