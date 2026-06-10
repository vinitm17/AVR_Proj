import { useEffect, useState } from "react";
import { BatteryCharging, Clock, Mail, MapPin, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from "../lib/api";

interface ProfileData {
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  totalPoints: string;
  totalSessions: number;
  stationsUsed: number;
  vehicle?: string;
}

export default function Profile() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/get/dashboard");
        const nameParts = response.data.data.userName.split(" ");
        setProfileData({
          ...response.data.data,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
        });
      } catch (err) {
        console.error("Error fetching profile data:", err);
        toast.error("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-[#90AB8B]/40 bg-[#F4F8ED] p-6 text-sm text-[#5A7863]">Loading profile...</div>;
  }

  if (!profileData) {
    return <div className="rounded-2xl border border-[#90AB8B]/40 bg-[#F4F8ED] p-6 text-sm text-[#5A7863]">No profile data found.</div>;
  }

  const initials = `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`.toUpperCase() || "U";
  const points = Number(profileData.totalPoints || 0);
  const estimatedMinutes = points * 5;

  return (
    <div className="space-y-5">
      <Card className="border-[#90AB8B]/45 bg-[#F4F8ED]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div className="flex items-center gap-5">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-[#3B4953] text-2xl font-semibold text-[#EBF4DD] shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#5A7863]">Account profile</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-[#26343A]">
                {profileData.firstName} {profileData.lastName}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-[#5A7863]">
                <Mail className="size-4" />
                <span className="truncate">{profileData.email}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#90AB8B]/45 bg-[#EBF4DD] p-4">
            <p className="text-sm font-medium text-[#5A7863]">Charging balance</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-[-0.04em] text-[#26343A]">{profileData.totalPoints}</span>
              <span className="pb-1 text-sm text-[#5A7863]">points</span>
            </div>
            <p className="mt-3 rounded-xl bg-[#90AB8B]/20 px-3 py-2 text-sm text-[#3B4953]">
              Approximately <span className="font-semibold text-[#26343A]">{estimatedMinutes}</span> charging minutes available.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <ProfileStat icon={<Wallet className="size-4" />} label="Available points" value={profileData.totalPoints} helper="Ready to spend" />
        <ProfileStat icon={<Clock className="size-4" />} label="Charging sessions" value={profileData.totalSessions} helper="Saved in history" />
        <ProfileStat icon={<MapPin className="size-4" />} label="Stations used" value={profileData.stationsUsed} helper="Unique locations" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-[#90AB8B]/45 bg-[#F4F8ED]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#26343A]"><User className="size-5" /> Personal information</CardTitle>
            <CardDescription className="text-[#5A7863]">Read-only details from your current account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Info label="First name" value={profileData.firstName} />
            <Info label="Last name" value={profileData.lastName} />
            <Info label="Email" value={profileData.email} />
            <Info label="Vehicle" value={profileData.vehicle || "Not added"} />
          </CardContent>
        </Card>

        <Card className="border-[#90AB8B]/45 bg-[#F4F8ED]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#26343A]"><BatteryCharging className="size-5" /> Charging readiness</CardTitle>
            <CardDescription className="text-[#5A7863]">Useful account signals before starting a session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Readiness label="Balance status" value={points > 0 ? "Ready to charge" : "Add points first"} />
            <Readiness label="History status" value={profileData.totalSessions > 0 ? `${profileData.totalSessions} sessions recorded` : "No sessions yet"} />
            <Readiness label="Station familiarity" value={profileData.stationsUsed > 0 ? `${profileData.stationsUsed} stations used` : "No station used yet"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileStat({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string | number; helper: string }) {
  return (
    <Card className="border-[#90AB8B]/45 bg-[#F4F8ED]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-[#5A7863]">{icon}{label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#26343A]">{value}</p>
            <p className="mt-1 text-sm text-[#5A7863]">{helper}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#90AB8B]/35 bg-[#EBF4DD]/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#5A7863]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#26343A]">{value}</p>
    </div>
  );
}

function Readiness({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#90AB8B]/35 bg-[#EBF4DD]/70 px-4 py-3">
      <span className="text-sm text-[#5A7863]">{label}</span>
      <span className="text-right text-sm font-semibold text-[#26343A]">{value}</span>
    </div>
  );
}
